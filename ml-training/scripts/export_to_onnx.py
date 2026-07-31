"""
Export trained model to ONNX format for browser usage
"""

import os
import shutil
import torch
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification

MODEL_DIR = "../trained-model/action-item-classifier"
ONNX_DIR = "../trained-model/action-item-classifier-onnx"
REACT_MODEL_DIR = "../../public/models/action-item-classifier"

print("=" * 50)
print("EXPORTING MODEL TO ONNX")
print("=" * 50)

# ============================================
# STEP 1: Load the trained model
# ============================================
print("\n📂 Loading trained model...")

tokenizer = DistilBertTokenizer.from_pretrained(MODEL_DIR)

model = DistilBertForSequenceClassification.from_pretrained(
    "distilbert-base-uncased",
    num_labels=2,
    id2label={0: "NOT_ACTION_ITEM", 1: "ACTION_ITEM"},
    label2id={"NOT_ACTION_ITEM": 0, "ACTION_ITEM": 1},
)

# Load trained weights
model.load_state_dict(torch.load(os.path.join(MODEL_DIR, "pytorch_model.bin")))
model.eval()

print("   ✅ Model loaded!")

# ============================================
# STEP 2: Create ONNX directory
# ============================================
os.makedirs(ONNX_DIR, exist_ok=True)

# ============================================
# STEP 3: Export to ONNX
# ============================================
print("\n📦 Exporting to ONNX format...")

# Create dummy input for export
dummy_input = tokenizer(
    "This is a sample sentence",
    return_tensors="pt",
    padding="max_length",
    max_length=64,
    truncation=True,
)

onnx_path = os.path.join(ONNX_DIR, "model.onnx")

torch.onnx.export(
    model,
    (dummy_input["input_ids"], dummy_input["attention_mask"]),
    onnx_path,
    input_names=["input_ids", "attention_mask"],
    output_names=["logits"],
    dynamic_axes={
        "input_ids": {0: "batch_size", 1: "sequence"},
        "attention_mask": {0: "batch_size", 1: "sequence"},
        "logits": {0: "batch_size"},
    },
    opset_version=14,
)

print(f"   ✅ ONNX model saved: {onnx_path}")

# ============================================
# STEP 4: Save tokenizer and config
# ============================================
print("\n💾 Saving tokenizer and config...")

tokenizer.save_pretrained(ONNX_DIR)
model.config.save_pretrained(ONNX_DIR)

# ============================================
# STEP 5: Copy to React public folder
# ============================================
print(f"\n📁 Copying to React project: {REACT_MODEL_DIR}")

if os.path.exists(REACT_MODEL_DIR):
    shutil.rmtree(REACT_MODEL_DIR)

shutil.copytree(ONNX_DIR, REACT_MODEL_DIR)

print("   ✅ Copied!")

# ============================================
# STEP 6: Show files
# ============================================
print("\n📁 Model files created:")
for f in os.listdir(REACT_MODEL_DIR):
    filepath = os.path.join(REACT_MODEL_DIR, f)
    size = os.path.getsize(filepath)
    if size > 1024 * 1024:
        print(f"   {f} ({size / 1024 / 1024:.1f} MB)")
    else:
        print(f"   {f} ({size / 1024:.1f} KB)")

print("\n" + "=" * 50)
print("🎉 EXPORT COMPLETE!")
print("=" * 50)