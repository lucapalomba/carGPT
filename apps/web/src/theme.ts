import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: { value: "#8acfd4" },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: "{colors.brand}" },
          contrast: { value: "{colors.white}" },
          fg: { value: "{colors.blue.700}" },
          muted: { value: "{colors.blue.100}" },
          subtle: { value: "{colors.blue.50}" },
          emphasized: { value: "{colors.blue.700}" },
          focus: { value: "{colors.blue.500}" },
        },
fg: {
          DEFAULT: { value: "{colors.black}" },
          muted: { value: "{colors.gray.600}" },
          subtle: { value: "{colors.gray.500}" },
          inverted: { value: "{colors.white}" },
          contrast: { value: "{colors.white}" },
          error: { value: "{colors.red.600}" },
          success: { value: "{colors.green.600}" },
        },
bg: {
          canvas: { value: "{colors.gray.50}" },
          panel: { value: "{colors.white}" },
          subtle: { value: "{colors.gray.50}" },
          muted: { value: "{colors.brand}" },
          overlay: { value: "rgba(0, 0, 0, 0.3)" },
        },
        border: {
          DEFAULT: { value: "{colors.gray.200}" },
          emphasized: { value: "{colors.gray.300}" },
          subtle: { value: "{colors.gray.100}" },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, customConfig)
