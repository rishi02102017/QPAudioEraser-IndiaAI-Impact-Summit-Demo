import math
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.utils.data import TensorDataset, DataLoader
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

NUM_CLASSES = 10
MEL_H = 128
MEL_W = 128
BATCH_SIZE = 32
TRAIN_EPOCHS = 10
UNLEARN_EPOCHS = 4
DEVICE = "cuda" if (TORCH_AVAILABLE and torch.cuda.is_available()) else "cpu"


class ResBlock(nn.Module):
    def __init__(self, ch):
        super().__init__()
        self.conv1 = nn.Conv2d(ch, ch, 3, padding=1)
        self.bn1 = nn.BatchNorm2d(ch)
        self.conv2 = nn.Conv2d(ch, ch, 3, padding=1)
        self.bn2 = nn.BatchNorm2d(ch)

    def forward(self, x):
        r = F.relu(self.bn1(self.conv1(x)))
        r = self.bn2(self.conv2(r))
        return F.relu(x + r)


class SpeakerNet(nn.Module):
    def __init__(self, num_classes=NUM_CLASSES):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 64, 7, stride=2, padding=3),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(3, stride=2, padding=1),
            ResBlock(64),
            ResBlock(64),
            nn.Conv2d(64, 128, 3, stride=2, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            ResBlock(128),
            ResBlock(128),
            nn.Conv2d(128, 256, 3, stride=2, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            ResBlock(256),
            ResBlock(256),
            nn.Conv2d(256, 512, 3, stride=2, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            ResBlock(512),
            ResBlock(512),
            nn.AdaptiveAvgPool2d(1),
        )
        self.fc = nn.Linear(512, num_classes)

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        return self.fc(x)


def get_dummy_mel_dataset(n_samples_per_class=300):
    X = torch.randn(n_samples_per_class * NUM_CLASSES, 1, MEL_H, MEL_W) * 0.5 + 0.5
    y = torch.arange(NUM_CLASSES).repeat_interleave(n_samples_per_class)
    perm = torch.randperm(len(y))
    return X[perm], y[perm]


def train_epoch(model, loader, optimizer, device):
    model.train()
    total_loss = 0.0
    correct = 0
    n = 0
    for X, y in loader:
        X, y = X.to(device), y.to(device)
        optimizer.zero_grad()
        logits = model(X)
        loss = F.cross_entropy(logits, y)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * X.size(0)
        correct += (logits.argmax(1) == y).sum().item()
        n += X.size(0)
    return total_loss / n, 100.0 * correct / n


def destructive_interference(model, forget_class):
    w = model.fc.weight.data
    b = model.fc.bias.data
    w_forget = w[forget_class].clone()
    b_forget = b[forget_class].clone()
    phase = math.pi
    scale = -np.cos(phase)
    w[forget_class] = w_forget * scale
    b[forget_class] = b_forget * scale


def superposition_labels(labels, forget_class):
    n = labels.size(0)
    u = torch.ones(n, NUM_CLASSES, dtype=torch.float, device=labels.device) / NUM_CLASSES
    onehot = F.one_hot(labels, NUM_CLASSES).float()
    mask = (labels == forget_class).unsqueeze(1).expand_as(onehot)
    return torch.where(mask, u, onehot)


def quantum_loss(logits, soft_labels, forget_mask, retain_mask):
    ce_retain = F.cross_entropy(logits[retain_mask], torch.argmax(soft_labels[retain_mask], 1))
    probs_forget = F.softmax(logits[forget_mask], dim=1)
    entropy_forget = -(probs_forget * (probs_forget + 1e-10).log()).sum(1).mean()
    return ce_retain - entropy_forget


def entanglement_mixing(model, forget_class, alpha=0.3):
    w = model.fc.weight.data.clone()
    K = NUM_CLASSES
    mix = torch.eye(K, device=w.device) * (1 - alpha) + (alpha / (K - 1)) * (1 - torch.eye(K, device=w.device))
    model.fc.weight.data = (mix @ w)
    if model.fc.bias is not None:
        b = model.fc.bias.data.clone()
        model.fc.bias.data = (mix @ b.unsqueeze(1)).squeeze(1)


def run_training():
    if not TORCH_AVAILABLE:
        return None, None, None
    model = SpeakerNet().to(DEVICE)
    X_train, y_train = get_dummy_mel_dataset()
    train_ds = TensorDataset(X_train, y_train)
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    for epoch in range(1, TRAIN_EPOCHS + 1):
        loss, acc = train_epoch(model, train_loader, optimizer, DEVICE)
    return model, X_train, y_train


def run_unlearning(model, X_train, y_train, forget_class):
    if not TORCH_AVAILABLE or model is None:
        return
    forget_class = forget_class % NUM_CLASSES
    destructive_interference(model, forget_class)
    soft_labels = superposition_labels(y_train, forget_class)
    optimizer = torch.optim.SGD(model.parameters(), lr=1e-4)
    train_ds = TensorDataset(X_train, y_train, soft_labels)
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
    for _ in range(UNLEARN_EPOCHS):
        model.train()
        for X, y_orig, sl in train_loader:
            X = X.to(DEVICE)
            sl = sl.to(DEVICE)
            y_orig = y_orig.to(DEVICE)
            r_mask = y_orig != forget_class
            f_mask = y_orig == forget_class
            if r_mask.sum() == 0 or f_mask.sum() == 0:
                continue
            optimizer.zero_grad()
            logits = model(X)
            loss = quantum_loss(logits, sl, f_mask, r_mask)
            loss.backward()
            optimizer.step()
    entanglement_mixing(model, forget_class)


def evaluate(model, X, y, forget_class):
    if not TORCH_AVAILABLE or model is None:
        return 0.0, 0.0
    model.eval()
    with torch.no_grad():
        logits = model(X.to(DEVICE))
        preds = logits.argmax(1).cpu()
    retain_mask = y != forget_class
    forget_mask = y == forget_class
    if forget_mask.sum() > 0:
        fa = (preds[forget_mask] == y[forget_mask]).float().mean().item() * 100
    else:
        fa = 0.0
    if retain_mask.sum() > 0:
        ra = (preds[retain_mask] == y[retain_mask]).float().mean().item() * 100
    else:
        ra = 0.0
    return fa, ra


def main():
    model, X_train, y_train = run_training()
    if model is None:
        return
    forget_class = 0
    fa_before, ra_before = evaluate(model, X_train, y_train, forget_class)
    run_unlearning(model, X_train, y_train, forget_class)
    fa_after, ra_after = evaluate(model, X_train, y_train, forget_class)


if __name__ == "__main__":
    main()
