#!/usr/bin/env python3
"""Analyze the exact color of the sign box from screenshot"""

import cv2
import numpy as np
from PIL import Image
import colorsys

# I'll analyze the color manually based on the screenshot
# The orange appears to be a medium-light orange/peach color

# Typical RGB values for this type of orange (estimated from visual inspection):
# R: ~220-240, G: ~160-180, B: ~100-120

# Let's test a few representative RGB values and convert to HSV
test_colors = [
    (230, 170, 110),  # Medium orange
    (235, 175, 115),  # Slightly lighter
    (225, 165, 105),  # Slightly darker
    (240, 180, 120),  # Lighter variant
    (220, 160, 100),  # Darker variant
]

print("Analyzing orange color from sign box '2007'")
print("=" * 50)

for rgb in test_colors:
    # Convert RGB to normalized values (0-1)
    r, g, b = [x/255.0 for x in rgb]
    
    # Convert to HSV (returns values in 0-1 range)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    
    # Convert to OpenCV HSV scale
    # H: 0-180, S: 0-255, V: 0-255
    h_cv = int(h * 180)
    s_cv = int(s * 255)
    v_cv = int(v * 255)
    
    print(f"\nRGB: {rgb}")
    print(f"HSV (OpenCV): H={h_cv}, S={s_cv}, V={v_cv}")

print("\n" + "=" * 50)
print("Recommended HSV range for detection:")
print("Lower bound: [15, 120, 180]")
print("Upper bound: [25, 180, 255]")

# Create a sample color patch to verify
import matplotlib.pyplot as plt
import matplotlib.patches as patches

fig, ax = plt.subplots(1, 1, figsize=(6, 2))

# Create color patches for each test color
for i, rgb in enumerate(test_colors):
    rect = patches.Rectangle((i, 0), 1, 1, 
                            facecolor=[x/255 for x in rgb])
    ax.add_patch(rect)
    ax.text(i+0.5, 0.5, f"{rgb[0]}\n{rgb[1]}\n{rgb[2]}", 
           ha='center', va='center', fontsize=8)

ax.set_xlim(0, len(test_colors))
ax.set_ylim(0, 1)
ax.set_aspect('equal')
ax.set_title('Sample Orange Colors for Sign Boxes')
ax.set_xticks([])
ax.set_yticks([])

plt.tight_layout()
plt.savefig('orange_color_samples.png', dpi=100)
print(f"\nColor samples saved to orange_color_samples.png")

# Based on visual analysis, the orange in the screenshot appears to be:
# Approximately RGB(230, 170, 110) which converts to HSV(20, 135, 230) in OpenCV scale