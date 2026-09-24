/** @type {import("tailwindcss").Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
  "colors": {
    "brand": {
      "navy": "#071e3d",
      "navyDark": "#001230",
      "navyDeep": "#0a2540",
      "orange": "#f58220",
      "orangeHover": "#e06d10",
      "orangeLight": "#ff7a00",
      "orangeSubtle": "#fff7ed"
    },
    "secondary-container": "#82f5c1",
    "on-secondary-fixed": "#002114",
    "surface-variant": "#dae2fd",
    "primary-fixed": "#dde1ff",
    "on-secondary": "#ffffff",
    "inverse-on-surface": "#eef0ff",
    "outline": "#757684",
    "primary": "#00288e",
    "surface-container-highest": "#dae2fd",
    "on-secondary-fixed-variant": "#005137",
    "surface-container": "#eaedff",
    "on-tertiary-container": "#ffa85d",
    "on-tertiary-fixed": "#2f1500",
    "surface-bright": "#faf8ff",
    "tertiary-fixed-dim": "#ffb77d",
    "error": "#ba1a1a",
    "secondary-fixed-dim": "#68dba9",
    "on-surface": "#131b2e",
    "surface-dim": "#d2d9f4",
    "on-primary": "#ffffff",
    "surface-container-lowest": "#ffffff",
    "on-background": "#131b2e",
    "on-surface-variant": "#444653",
    "surface-tint": "#3755c3",
    "on-primary-container": "#a8b8ff",
    "secondary": "#006c4a",
    "tertiary": "#532a00",
    "tertiary-container": "#743d00",
    "on-tertiary-fixed-variant": "#6e3900",
    "surface": "#faf8ff",
    "on-secondary-container": "#00714e",
    "primary-fixed-dim": "#b8c4ff",
    "on-error-container": "#93000a",
    "error-container": "#ffdad6",
    "surface-container-high": "#e2e7ff",
    "inverse-primary": "#b8c4ff",
    "inverse-surface": "#283044",
    "on-error": "#ffffff",
    "on-primary-fixed": "#001453",
    "tertiary-fixed": "#ffdcc3",
    "on-primary-fixed-variant": "#173bab",
    "background": "#faf8ff",
    "primary-container": "#1e40af",
    "on-tertiary": "#ffffff",
    "outline-variant": "#c4c5d5",
    "surface-container-low": "#f2f3ff",
    "secondary-fixed": "#85f8c4"
  },
  "spacing": {
    "margin": "2rem",
    "gutter": "1.5rem",
    "space-xs": "0.25rem",
    "space-xl": "1.5rem",
    "margin-mobile": "1rem",
    "space-lg": "1.25rem",
    "space-sm": "0.5rem",
    "gutter-mobile": "1rem",
    "space-md": "0.75rem",
    "gutter-desktop": "1.5rem",
    "space-2xl": "2rem",
    "space-4xl": "3rem",
    "space-2xs": "0.125rem",
    "space-3xl": "2.5rem",
    "container-max": "80rem",
    "space-base": "1rem",
    "space-5xl": "4rem"
  },
  "fontSize": {
    "body-lg": [
      "16px",
      {
        "lineHeight": "26px",
        "fontWeight": "400"
      }
    ],
    "display": [
      "40px",
      {
        "lineHeight": "52px",
        "letterSpacing": "-0.02em",
        "fontWeight": "700"
      }
    ],
    "label-lg": [
      "14px",
      {
        "lineHeight": "20px",
        "letterSpacing": "0.01em",
        "fontWeight": "600"
      }
    ],
    "label-sm": [
      "11px",
      {
        "lineHeight": "14px",
        "letterSpacing": "0.025em",
        "fontWeight": "500"
      }
    ],
    "headline-md": [
      "24px",
      {
        "lineHeight": "32px",
        "letterSpacing": "-0.01em",
        "fontWeight": "600"
      }
    ],
    "headline-sm": [
      "20px",
      {
        "lineHeight": "28px",
        "fontWeight": "600"
      }
    ],
    "display-mobile": [
      "30px",
      {
        "lineHeight": "38px",
        "letterSpacing": "-0.015em",
        "fontWeight": "700"
      }
    ],
    "title-sm": [
      "16px",
      {
        "lineHeight": "24px",
        "fontWeight": "600"
      }
    ],
    "body-md": [
      "14px",
      {
        "lineHeight": "22px",
        "fontWeight": "400"
      }
    ],
    "headline-lg": [
      "32px",
      {
        "lineHeight": "40px",
        "letterSpacing": "-0.02em",
        "fontWeight": "700"
      }
    ],
    "label-md": [
      "12px",
      {
        "lineHeight": "16px",
        "letterSpacing": "0.02em",
        "fontWeight": "600"
      }
    ],
    "body-sm": [
      "12px",
      {
        "lineHeight": "18px",
        "fontWeight": "400"
      }
    ],
    "headline-lg-mobile": [
      "24px",
      {
        "lineHeight": "32px",
        "letterSpacing": "-0.01em",
        "fontWeight": "700"
      }
    ],
    "title-md": [
      "18px",
      {
        "lineHeight": "26px",
        "fontWeight": "600"
      }
    ]
  },
  "borderRadius": {
    "DEFAULT": "0.25rem",
    "lg": "0.5rem",
    "xl": "0.75rem",
    "2xl": "1rem",
    "3xl": "1.5rem",
    "full": "9999px"
  },
  "fontFamily": {
    "sans": [
      "\"Be Vietnam Pro\"",
      "Inter",
      "sans-serif"
    ],
    "heading": [
      "\"Be Vietnam Pro\"",
      "sans-serif"
    ],
    "body-sm": [
      "Be Vietnam Pro"
    ],
    "headline-lg": [
      "Be Vietnam Pro"
    ],
    "label-md": [
      "Be Vietnam Pro"
    ],
    "headline-sm": [
      "Be Vietnam Pro"
    ],
    "label-sm": [
      "Be Vietnam Pro"
    ],
    "body-md": [
      "Be Vietnam Pro"
    ],
    "body-lg": [
      "Be Vietnam Pro"
    ],
    "display-lg-mobile": [
      "Be Vietnam Pro"
    ],
    "label-lg": [
      "Be Vietnam Pro"
    ],
    "headline-md": [
      "Be Vietnam Pro"
    ],
    "headline-xl-mobile": [
      "Be Vietnam Pro"
    ],
    "display-lg": [
      "Be Vietnam Pro"
    ],
    "headline-xl": [
      "Be Vietnam Pro"
    ],
    "display": [
      "Be Vietnam Pro"
    ],
    "display-mobile": [
      "Be Vietnam Pro"
    ],
    "title-sm": [
      "Be Vietnam Pro"
    ],
    "headline-lg-mobile": [
      "Be Vietnam Pro"
    ],
    "title-md": [
      "Be Vietnam Pro"
    ]
  }
}
  },
  plugins: [],
};
