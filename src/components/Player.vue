<template>
  <div class="container-fluid" @keyup.left="previousFrame" @keyup.right="nextFrame" @keyup.space="markOrUnmark">
    <div class="row justify-content-between">
      <div class="text-start col-4">
        <button class="btn btn-primary" @click="previousVideo" v-if="isTherePreviousVideo">PREVIOUS VIDEO</button>
      </div>
      <div class="text-center col-4">
        <h3>{{ currentVideoName }}</h3>
        <p>The FPS will appear here!</p>
      </div>
      <div class="text-end col-4">
        <button class="btn btn-primary" @click="nextVideo" v-if="isThereNextVideo">NEXT VIDEO</button>
      </div>
    </div>
    <div class="row justify-content-between">
      <div class="text-start col-4">
        <div>Current frame number: {{ currentFrame }}</div>
        <div>Marked not OK frames: {{ markedFrames }}</div>
      </div>
      <div class="text-center col-4">
        <button class="btn btn-primary" @click="previousFrame" v-if="!isPlaying">PREVIOUS FRAME</button>
        <button class="btn" :class="isCurrentFrameMarked ? 'btn-success' : 'btn-danger'" @click="markOrUnmark" v-if="!isPlaying">
          {{ isCurrentFrameMarked ? 'UNMARK' : 'MARK' }}</button>
        <!--<button class="btn btn-danger" @click="markNotOk" v-if="!isPlaying && !isCurrentFrameMarked">Mark Not OK</button>
        <button class="btn btn-success" @click="markOk" v-if="!isPlaying && isCurrentFrameMarked">Mark OK</button>-->
        <button class="btn btn-primary" @click="nextFrame" v-if="!isPlaying">NEXT FRAME</button>
      </div>
      <div class="text-end col-4">
        <button type="button" class="btn btn-warning" @click="clear" v-if="markedFrames.length">Clear not OK list</button>
        <button type="button" class="btn btn-warning" @click="saveToBackend">SAVE</button>
      </div>
    </div>
    <div class="row justify-content-between">
      <div class="text-center col-12">
        <video-player
            :src='currentVideoName'
            controls
            :volume="0.6"
            :height="600"
            :width="600"
            :muted="true"
            autoplay="false"
            @ready="setFrame"
            @play="setPlaying"
            @pause="setFrame"
            @ended="setFrame"
            @seeking="seeked"
        />
      </div>
    </div>
  </div>
</template>

<script>
import {defineComponent} from 'vue'
import { VideoPlayer } from '@videojs-player/vue'
import 'video.js/dist/video-js.css'

export default defineComponent({
  components: {
    VideoPlayer
  },

  data() {
    return {
      apiUrl: "http://localhost:8080/api/v1/",
      videos: [],
      currentVideoName: "",
      currentVideoIndex: 0,
      videoPlayer: null,
      isPlaying: false,
      currentFrame: 0,
      //it will be calculated
      currentVideoFrameRate: 15,
      markedFrames: [],
      currentVideo : {
        lastMediaTime: 0,
        lastFrameNum: 0,
        fps: 0,
        fpsRounder: [],
        frameNotSeeked: true
      }
    }
  },

  computed: {
    isTherePreviousVideo() {
      return !this.videos.empty && (this.currentVideoIndex > 0);
    },
    isThereNextVideo() {
      return !this.videos.empty && (this.currentVideoIndex < this.videos.length - 1);
    },
    isCurrentFrameMarked() {
      return this.markedFrames.includes(this.currentFrame);
    }
  },

  mounted() {
    fetch(this.apiUrl + "videos")
      .then(res => res.json())
      .then(data => {
        if(data && !data.empty) {
          this.videos = data;
          this.currentVideoIndex = 0;
          this.currentVideoName = data[0];
          this.loadFromBackend();
        }
      });
    this.videoPlayer = document.querySelector("video");
    this.videoPlayer.requestVideoFrameCallback(this.ticker);
  },

  methods: {
    resetVariables() {
      this.currentVideo = {
        lastMediaTime: 0,
        lastFrameNum: 0,
        fps: 0,
        fpsRounder: [],
        frameNotSeeked: true
      }
    },
    loadFromBackend() {
      fetch(this.apiUrl + "videoanalysis/" + this.currentVideoName)
        .then(res => res.json())
        .then(data => {
          this.resetVariables();
          if(data.markedFrames) {
            this.markedFrames = data.markedFrames.split(',').map(Number);
          } else {
            this.markedFrames = [];
          }
        });
    },
    saveToBackend() {
      const dataObj = {
        fileName: this.currentVideoName,
        markedFrames: this.markedFrames.length ? this.markedFrames.toString() : ""
      }
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataObj)
      };
      fetch(this.apiUrl + "videoanalysis", requestOptions)
        .then(res => res.json())
        .then(_ => {
          this.$notify({
            title: '<h5>Saved to backend successfully!</h5>',
            type: 'success',
            duration: 2000,
            speed: 1000
          })
        }).else;
    },
    previousVideo() {
      this.currentVideoName = this.videos[--this.currentVideoIndex];
      this.loadFromBackend();
    },
    nextVideo() {
      this.currentVideoName = this.videos[++this.currentVideoIndex];
      this.loadFromBackend();
    },
    previousFrame() {
      if(!this.isPlaying) {
        this.videoPlayer.currentTime = (this.videoPlayer.currentTime  - (1 / this.currentVideoFrameRate)).toFixed(6);
        this.setFrame();
      }
    },
    nextFrame() {
      if(!this.isPlaying) {
        this.videoPlayer.currentTime = (this.videoPlayer.currentTime  + (1 / this.currentVideoFrameRate)).toFixed(6);
        this.setFrame();
      }
    },
    markOrUnmark() {
      if(!this.isPlaying) {
        const index = this.markedFrames.indexOf(this.currentFrame);
        if(index !== -1) {
          this.markedFrames.splice(index, 1);
        } else {
          this.markedFrames.push(this.currentFrame);
        }
      }
    },
    clear() {
      this.markedFrames = [];
    },
    setPlaying() {
      this.isPlaying = true;
      this.currentFrame = 0;
    },
    setFrame() {
      this.isPlaying = false;
      this.currentFrame = Math.floor(this.videoPlayer.currentTime * this.currentVideoFrameRate);
    },

    ticker(useless, metadata) {
      const media_time_diff = Math.abs(metadata.mediaTime - this.currentVideo.lastMediaTime);
      const frame_num_diff = Math.abs(metadata.presentedFrames - this.currentVideo.lastFrameNum);
      const diff = media_time_diff / frame_num_diff;
      if (
        diff &&
        diff < 1 &&
        this.currentVideo.frameNotSeeked &&
        this.currentVideo.fpsRounder.length < 50 &&
        this.videoPlayer.playbackRate === 1 &&
        document.hasFocus()
      ) {
        this.currentVideo.fpsRounder.push(diff);
        this.currentVideo.fps = Math.round(1 / this.get_fps_average());
        const certainty = this.currentVideo.fpsRounder.length * 2;
        document.querySelector("p").textContent = "FPS: " + this.currentVideo.fps + ", certainty: " + certainty + "%";
          this.currentVideoFrameRate = this.currentVideo.fps;

      }
      this.currentVideo.frameNotSeeked = true;
      this.currentVideo.lastMediaTime = metadata.mediaTime;
      this.currentVideo.lastFrameNum = metadata.presentedFrames;
      this.videoPlayer.requestVideoFrameCallback(this.ticker);
    },
    get_fps_average() {
      return this.currentVideo.fpsRounder.reduce((a, b) => a + b) / this.currentVideo.fpsRounder.length;
    },
    seeked() {
      this.setFrame();
      this.currentVideo.fpsRounder.pop();
      this.currentVideo.frameNotSeeked = false;
    }
  }
})
</script>