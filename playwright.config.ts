import { defineConfig } from '@playwright/test'
import process from 'node:process'
export default defineConfig({
  testDir:'./tests/browser', timeout:180_000, workers:1,
  use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1280,height:800},launchOptions:{
    executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']
  }},
  webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:false}
})
