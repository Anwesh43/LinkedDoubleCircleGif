const GifEncoder = require('gifencoder')
const Canvas = require('canvas')
const w = 500, h = 600, nodes = 5

class State {
    constructor() {
        this.scale = 0
        this.dir = 0
        this.prevScale = 0
    }

    update(cb) {
        this.scale += this.dir * 0.1
        console.log(this.scale)
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir
            this.dir = 0
            this.prevScale = this.scale
            cb()
        }
    }

    startUpdating() {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale
        }
    }
}

class DoubleCircleNode {
    constructor(i) {
        this.i = i
        this.state = new State()
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < nodes - 1) {
            this.next = new DoubleCircleNode(this.i + 1)
            this.next.prev = this
        }
    }

    draw(context) {
        context.fillStyle = '#388E3C'
        const gap = h / (nodes + 1)
        context.save()
        context.translate(w/2, gap * this.i + gap)
        for(var i = 0; i < 2; i++) {
            context.save()
            context.translate((1 - 2 * i) * (w/2 - gap/3) * this.state.scale, 0)
            context.beginPath()
            context.arc(0, 0, gap/3, 0, 2 * Math.PI)
            context.fill()
            context.restore()
        }
        context.restore()
        if (this.next) {
            this.next.draw(context)
        }
    }

    update(cb) {
        this.state.update(cb)
    }

    startUpdating(cb) {
        this.state.startUpdating(cb)
    }

    getNext(dir, cb) {
        var curr = this.prev
        if (dir == 1) {
            curr = this.next
        }
        if (curr) {
            return curr
        }
        cb()
        return this
    }
}

class LinkedDoubleCircle {
    constructor() {
        this.root = new DoubleCircleNode(0)
        this.curr = this.root
        this.dir = 1
        this.curr.startUpdating()
    }

    draw(context) {
        this.root.draw(context)
    }

    update(cb) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            if (this.dir == 1 && this.curr.i == 0) {
                cb()
            } else {
                this.curr.startUpdating()
            }
        })
    }
}

class Renderer {
    constructor() {
        this.running = true
        this.ldc = new LinkedDoubleCircle()
    }

    render(context, cb, stopcb) {
        while (this.running) {
            context.fillStyle = '#BDBDBD'
            context.fillRect(0, 0, w, h)
            this.ldc.draw(context)
            cb(context)
            this.ldc.update(() => {
                stopcb()
                this.running = false
            })
        }
    }
}

class LinkedDoubleCircleGif {
    constructor() {
        this.renderer = new Renderer()
        this.encoder = new GifEncoder(w, h)
        this.canvas = new Canvas(w, h)
        this.context = this.canvas.getContext('2d')
    }

    initEncoder(fn) {
        this.encoder.createReadStream().pipe(require('fs').createWriteStream(fn))
        this.encoder.setRepeat(0)
        this.encoder.setDelay(50)
    }

    render() {
        this.encoder.start()
        this.renderer.render(this.context, (ctx) => {
            this.encoder.addFrame(ctx)
        }, () => {
            this.encoder.end()
        })
    }
}

module.exports = function(fn) {
    const stage = new LinkedDoubleCircleGif()
    stage.initEncoder(fn)
    stage.render()
}
