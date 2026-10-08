/** @type {import("tailwindcss").Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
  "colors": {
    "brand": {
      "navy": "#0B3A8C",
      "navyDark": "#0A2B6B",
      "navyDeep": "#082A66",
      "orange": "#F5A00F",
      "orangeHover": "#DE8B00",
      "orangeLight": "#F5A00F",
      "orangeSubtle": "#fff7ed"
    },
    "secondary-container": "#82f5c1",
    "on-secondary-fixed": "#002114",
    "surface-variant": "#D0E4FB",
    "primary-fixed": "#DCEAFC",
    "on-secondary": "#ffffff",
    "inverse-on-surface": "#EEF5FE",
    "outline": "#757684",
    "primary": "#0B3A8C",
    "surface-container-highest": "#D0E4FB",
    "on-secondary-fixed-variant": "#005137",
    "surface-container": "#E3EFFD",
    "on-tertiary-container": "#ffa85d",
    "on-tertiary-fixed": "#2f1500",
    "surface-bright": "#F5F9FF",
    "tertiary-fixed-dim": "#ffb77d",
    "error": "#ba1a1a",
    "secondary-fixed-dim": "#68dba9",
    "on-surface": "#14213D",
    "surface-dim": "#C6DAF4",
    "on-primary": "#ffffff",
    "surface-container-lowest": "#ffffff",
    "on-background": "#14213D",
    "on-surface-variant": "#444653",
    "surface-tint": "#0057C2",
    "on-primary-container": "#CFE3FB",
    "secondary": "#006c4a",
    "tertiary": "#532a00",
    "tertiary-container": "#743d00",
    "on-tertiary-fixed-variant": "#6e3900",
    "surface": "#F5F9FF",
    "on-secondary-container": "#00714e",
    "primary-fixed-dim": "#B9D6F8",
    "on-error-container": "#93000a",
    "error-container": "#ffdad6",
    "surface-container-high": "#D9E9FC",
    "inverse-primary": "#B9D6F8",
    "inverse-surface": "#082A66",
    "on-error": "#ffffff",
    "on-primary-fixed": "#082A66",
    "tertiary-fixed": "#ffdcc3",
    "on-primary-fixed-variant": "#0B3A8C",
    "background": "#F5F9FF",
    "primary-container": "#1560D6",
    "on-tertiary": "#ffffff",
    "outline-variant": "#c4c5d5",
    "surface-container-low": "#EEF5FE",
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
    "sans": ["\"Be Vietnam Pro\"", "sans-serif"],
    "headline": ["\"Be Vietnam Pro\"", "sans-serif"],
    "body": ["\"Be Vietnam Pro\"", "sans-serif"],
    "label": ["\"Be Vietnam Pro\"", "sans-serif"],
    "heading": ["\"Be Vietnam Pro\"", "sans-serif"],
    "body-sm": ["\"Be Vietnam Pro\"", "sans-serif"],
    "headline-lg": ["\"Be Vietnam Pro\"", "sans-serif"],
    "label-md": ["\"Be Vietnam Pro\"", "sans-serif"],
    "headline-sm": ["\"Be Vietnam Pro\"", "sans-serif"],
    "label-sm": ["\"Be Vietnam Pro\"", "sans-serif"],
    "body-md": ["\"Be Vietnam Pro\"", "sans-serif"],
    "body-lg": ["\"Be Vietnam Pro\"", "sans-serif"],
    "display-lg-mobile": ["\"Be Vietnam Pro\"", "sans-serif"],
    "label-lg": ["\"Be Vietnam Pro\"", "sans-serif"],
    "headline-md": ["\"Be Vietnam Pro\"", "sans-serif"],
    "headline-xl-mobile": ["\"Be Vietnam Pro\"", "sans-serif"],
    "display-lg": ["\"Be Vietnam Pro\"", "sans-serif"],
    "headline-xl": ["\"Be Vietnam Pro\"", "sans-serif"],
    "display": ["\"Be Vietnam Pro\"", "sans-serif"],
    "display-mobile": ["\"Be Vietnam Pro\"", "sans-serif"],
    "title-sm": ["\"Be Vietnam Pro\"", "sans-serif"],
    "headline-lg-mobile": ["\"Be Vietnam Pro\"", "sans-serif"],
    "title-md": ["\"Be Vietnam Pro\"", "sans-serif"]
  }
}
  },
  plugins: [],
};
