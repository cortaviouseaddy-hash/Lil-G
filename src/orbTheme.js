export const orbThemes = {
  white: {
    gradient: "radial-gradient(circle at 35% 28%, #ffffff, #f6f8ff 35%, #dfe7ff 62%, #9fb4e8)",
    shadow: "0 0 2.2rem rgba(255, 255, 255, 0.55), inset -0.85rem -1rem 1.6rem rgba(95, 117, 165, 0.32)"
  },
  mint: {
    gradient: "radial-gradient(circle at 35% 28%, #effff8, #b7f3d7 35%, #7cdbb5 62%, #2f9f74)",
    shadow: "0 0 2.2rem rgba(124, 219, 181, 0.55), inset -0.85rem -1rem 1.6rem rgba(47, 159, 116, 0.28)"
  },
  blue: {
    gradient: "radial-gradient(circle at 35% 28%, #f3f7ff, #c7d8ff 35%, #8fb4ff 62%, #4d74d8)",
    shadow: "0 0 2.2rem rgba(143, 180, 255, 0.55), inset -0.85rem -1rem 1.6rem rgba(77, 116, 216, 0.28)"
  },
  purple: {
    gradient: "radial-gradient(circle at 35% 28%, #f9f1ff, #dfc4ff 35%, #c49bff 62%, #7d49c8)",
    shadow: "0 0 2.2rem rgba(196, 155, 255, 0.55), inset -0.85rem -1rem 1.6rem rgba(125, 73, 200, 0.28)"
  },
  gold: {
    gradient: "radial-gradient(circle at 35% 28%, #fff8e8, #ffe2a1 35%, #ffd36c 62%, #c98d24)",
    shadow: "0 0 2.2rem rgba(255, 211, 108, 0.55), inset -0.85rem -1rem 1.6rem rgba(201, 141, 36, 0.28)"
  },
  pink: {
    gradient: "radial-gradient(circle at 35% 28%, #fff3f8, #ffc7df 35%, #ff9fcb 62%, #d85f95)",
    shadow: "0 0 2.2rem rgba(255, 159, 203, 0.55), inset -0.85rem -1rem 1.6rem rgba(216, 95, 149, 0.28)"
  },
  red: {
    gradient: "radial-gradient(circle at 35% 28%, #fff1ef, #ffb0a8 35%, #ff7a7a 62%, #c9483f)",
    shadow: "0 0 2.2rem rgba(255, 122, 122, 0.55), inset -0.85rem -1rem 1.6rem rgba(201, 72, 63, 0.28)"
  }
};

export function getOrbTheme(color) {
  return orbThemes[color] ?? orbThemes.white;
}

export function applyOrbTheme(element, color) {
  const theme = getOrbTheme(color);
  element.style.background = theme.gradient;
  element.style.boxShadow = theme.shadow;
  element.dataset.color = color;
}
