import { createApp } from 'vue'
import VueVideoPlayer from '@videojs-player/vue'
import Notifications from '@kyvg/vue3-notification'
// @ts-ignore
import App from './App.vue'
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap"
import 'video.js/dist/video-js.css'

const app = createApp(App)

app.use(VueVideoPlayer)
app.use(Notifications)
app.mount('#app')