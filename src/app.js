const app = Vue.createApp({
    template: `
    <!-- Canvas -->
    <canvas
        class="vw-100 vh-100"
        ref="canvas" @mousedown="downCanvas" @mousemove="moveCanvas" @mouseup="outCanvas" @mouseleave="outCanvas" @click="clickCanvas"></canvas>

    <!-- Tool Box -->
    <div id="tool" class="p-4 shadow rounded-3 bg-white">
        <div class="row gy-5">

            <!-- Buttons -->
            <div class="col-12 col-sm-6">
                <div class="row g-2">

                    <div class="col-12">
                        <button class="w-100 btn btn-primary" @click="stopProgress" v-if="isRunning"><span class="h4">Stop</span></button>
                        <button class="w-100 btn btn-primary" @click="runProgress" v-else><span class="h4">Start</span></button>
                    </div>
                    <div class="col-6">
                        <button class="w-100 btn btn-secondary" @click="nextProgress">Next</button>
                    </div>
                    <div class="col-6">
                        <button class="w-100 btn btn-secondary" @click="init">Reset</button>
                    </div>

                </div>
            </div>

            <!-- Settings -->
            <div class="col-12 col-sm-6">
                <div class="row g-2">

                    <div class="col-12">
                        <div class="row">
                            <div class="col-3">
                                <label for="speed" class="form-label">Speed</label>
                            </div>
                            <div class="col">
                                <input type="range" id="speed" class="form-range" min="100" max="1000" v-model="runSpeed">
                            </div>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="row">
                            <div class="col-3">
                                <label for="size" class="form-label">Size</label>
                            </div>
                            <div class="col">
                                <input type="range" id="size" class="form-range" min="15" max="50" v-model="gridSize">
                            </div>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="row">
                            <div class="col-3">
                                <span>Progress</span>
                            </div>
                            <div class="col">
                                {{progressCnt}}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    </div>
    `,
    data() {
        return {
            /** location **/
            standardX: 0,
            standardY: 0,
            /** grid **/
            gridSize: 30,
            /** running **/
            runSpeed: 500,
            progressCnt: 0,
            isRunning: false,
            intervalProgress: null,
            /** drag **/
            dragDown: false,
            dragMove: false,
            /** block data **/
            blocks: [],
        }
    },
    methods: {
        /** init **/
        init() {
            Object.assign(this.$data, this.$options.data.apply(this))

            const canvas = this.$refs.canvas;
            this.standardX = Math.round(canvas.offsetWidth / 2);
            this.standardY = Math.round(canvas.offsetHeight / 2);

            this.draw();
        },
        /**
         * event
         **/
        downCanvas(e) {
            this.dragDown = true;
            this.dragMove = false;
        },
        moveCanvas(e) {
            if (!this.dragDown) return;
            this.dragMove = true;

            this.standardX += e.movementX;
            this.standardY += e.movementY;

            this.draw();
        },
        outCanvas(e) {
            this.dragDown = false;
        },
        clickCanvas(e) {
            if (this.dragMove) return;

            const x = Math.floor((e.offsetX - this.standardX) / this.gridSize);
            const y = Math.floor((e.offsetY - this.standardY) / this.gridSize);

            const idx = this.blocks.findIndex(block => block.x === x && block.y === y)
            if(idx === -1) {
                this.blocks.push({x, y});
            } else {
                this.blocks.splice(idx, 1);
            }

            this.draw();
        },
        /**
         * draw canvas
         **/
        draw() {
            /** define **/
            const canvas = this.$refs.canvas;
            const ctx = canvas.getContext("2d");
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;

            /** fill Background **/
            ctx.fillStyle = "#ddd";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            /** draw block **/
            ctx.beginPath();
            this.blocks.forEach(({x, y}) => {
                ctx.rect(x * this.gridSize + this.standardX, y * this.gridSize + this.standardY, this.gridSize, this.gridSize);
            })
            ctx.fillStyle = "yellow";
            ctx.fill();

            /** draw line **/
            ctx.beginPath();
            let x = this.standardX % this.gridSize;
            let y = this.standardY % this.gridSize;

            while (x <= canvas.width) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);

                x += +this.gridSize;
            }
            while (y <= canvas.width) {
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);

                y += +this.gridSize;
            }

            ctx.strokeStyle = "#888";
            ctx.stroke();

            /** standard point (develop mode) **/
            ctx.beginPath();
            ctx.arc(this.standardX, this.standardY, this.gridSize / 5, 0, Math.PI * 2);
            ctx.fillStyle = "red";
            ctx.fill();
        },
        /**
         * progress
         **/
        getNeighbours({x, y}) {
            return [
                {x: x - 1, y: y - 1}, // left + top
                {x: x + 0, y: y - 1}, // center + top
                {x: x + 1, y: y - 1}, // right + top
                {x: x - 1, y: y + 0}, // left + middle
                {x: x + 1, y: y + 0}, // right + middle
                {x: x - 1, y: y + 1}, // left + bottom
                {x: x + 0, y: y + 1}, // center + bottom
                {x: x + 1, y: y + 1}, // right + bottom
            ]
        },
        nextProgress() {
            if (!this.blocks.length) return false;

            const stringifyArr = arr => arr.map(item => JSON.stringify(item));
            const parseArr = arr => arr.map(item => JSON.parse(item));

            const nextTickBlocks = [];
            let blocksSet = new Set(stringifyArr(this.blocks));

            this.blocks.forEach(block => {
                const neighbours = this.getNeighbours(block);
                blocksSet = new Set([...blocksSet, ...stringifyArr(neighbours)]);
            })

            parseArr([...blocksSet]).forEach(block => {
                let liveCnt = 0;
                this.blocks.forEach(otherBlock => {
                    this.getNeighbours(block).forEach(neighbour => {
                        if (neighbour.x === otherBlock.x && neighbour.y === otherBlock.y) {
                            liveCnt += 1;
                        }
                    })
                })

                if (
                    liveCnt === 3 ||
                    (liveCnt === 2 && this.blocks.some(b => b.x === block.x && b.y === block.y))
                ) nextTickBlocks.push(block);

            })

            this.progressCnt += 1;
            this.blocks = nextTickBlocks;

            this.draw();

            return true;
        },
        runProgress() {
            this.isRunning = true;
            this.intervalProgress = setInterval(() => {
                if(!this.nextProgress()) {
                    this.stopProgress();
                }
            }, this.runSpeed);
        },
        stopProgress() {
            clearInterval(this.intervalProgress);
            this.isRunning = false;
        }
    },
    created() {
        window.addEventListener("resize", this.draw);
    },
    mounted() {
        this.init();
    },
    watch: {
        gridSize() {
            this.draw();
        },
        runSpeed() {
            if(this.isRunning) {
                this.stopProgress();
                this.runProgress();
            }
        }
    }
})