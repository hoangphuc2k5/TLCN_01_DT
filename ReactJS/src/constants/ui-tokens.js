const spacing = Object.freeze({
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
});

export const UI_TOKENS = Object.freeze({
  colorPrimary: '#0f4c5c',
  colorText: '#1f2933',
  colorTextSecondary: '#65727a',
  colorBgLayout: '#f5f7f8',
  colorBgContainer: '#ffffff',
  colorBorderSecondary: '#dfe6e9',
  borderRadius: 8,
  borderRadiusLG: 12,
  fontFamily: "'Be Vietnam Pro', 'Segoe UI', sans-serif",
  spacing,
});

export const ANT_DESIGN_THEME = Object.freeze({
  token: Object.freeze({
    colorPrimary: UI_TOKENS.colorPrimary,
    colorText: UI_TOKENS.colorText,
    colorTextSecondary: UI_TOKENS.colorTextSecondary,
    colorBgLayout: UI_TOKENS.colorBgLayout,
    colorBgContainer: UI_TOKENS.colorBgContainer,
    colorBorderSecondary: UI_TOKENS.colorBorderSecondary,
    borderRadius: UI_TOKENS.borderRadius,
    borderRadiusLG: UI_TOKENS.borderRadiusLG,
    fontFamily: UI_TOKENS.fontFamily,
  }),
});

export const applyUiCssVariables = () => {
  if (typeof document === 'undefined') return;

  const variables = {
    '--ui-color-primary': UI_TOKENS.colorPrimary,
    '--ui-color-text': UI_TOKENS.colorText,
    '--ui-color-text-secondary': UI_TOKENS.colorTextSecondary,
    '--ui-color-canvas': UI_TOKENS.colorBgLayout,
    '--ui-color-surface': UI_TOKENS.colorBgContainer,
    '--ui-color-border': UI_TOKENS.colorBorderSecondary,
    '--ui-font-family': UI_TOKENS.fontFamily,
    '--ui-radius-control': `${UI_TOKENS.borderRadius}px`,
    '--ui-radius-card': `${UI_TOKENS.borderRadiusLG}px`,
  };

  Object.entries(UI_TOKENS.spacing).forEach(([name, value]) => {
    variables[`--ui-space-${name}`] = `${value}px`;
  });

  Object.entries(variables).forEach(([name, value]) => {
    document.documentElement.style.setProperty(name, value);
  });
};
