import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar } from '@quasar/vite-plugin'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls: { base: null } } }), quasar(), basicSsl()], // ponytail: self-signed HTTPS so phones allow GPS on the dev server
})
