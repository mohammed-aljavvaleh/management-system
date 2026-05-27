"use client";

import React from "react";

export function getAvatarColor(name: string) {
  const colors = [
    { bg: "#f5ede5", text: "#a1724e" }, // Soft bronze / cream
    { bg: "#e8f2fc", text: "#1a6fa0" }, // Soft blue
    { bg: "#e8f5e8", text: "#2d7a2d" }, // Soft green
    { bg: "#fef9e7", text: "#8a7300" }, // Soft gold / yellow
    { bg: "#fdf0f5", text: "#b33b70" }, // Soft pink
    { bg: "#f3eafa", text: "#6b3ba7" }, // Soft purple
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0]) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "?";
}

interface AvatarProps {
  name: string;
  size?: number;
  style?: React.CSSProperties;
  fontSize?: number;
}

export function Avatar({ name, size = 36, style, fontSize }: AvatarProps) {
  const avatar = getAvatarColor(name);
  const initials = getInitials(name);
  const calculatedFontSize = fontSize ?? Math.max(10, Math.floor(size * 0.36));

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: avatar.bg,
        color: avatar.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: calculatedFontSize,
        fontWeight: 600,
        flexShrink: 0,
        fontFamily: "var(--font-display), sans-serif",
        ...style,
      }}
    >
      {initials}
    </div>
  );
}
