// index.ts - 俄罗斯方块主逻辑
const COLS = 10
const ROWS = 20

type Status = 'idle' | 'running' | 'paused' | 'over'

interface Piece {
  shapeIndex: number
  rotation: number
  x: number
  y: number
  blocks: number[][]
}

const SHAPES: number[][][] = [
  [[1, 1, 1, 1]], // I
  [
    [1, 1],
    [1, 1],
  ], // O
  [
    [0, 1, 0],
    [1, 1, 1],
  ], // T
  [
    [1, 0, 0],
    [1, 1, 1],
  ], // J
  [
    [0, 0, 1],
    [1, 1, 1],
  ], // L
  [
    [1, 1, 0],
    [0, 1, 1],
  ], // S
  [
    [0, 1, 1],
    [1, 1, 0],
  ], // Z
]

const rotateMatrix = (matrix: number[][], times: number): number[][] => {
  let result = matrix
  for (let t = 0; t < times; t++) {
    const row = result.length
    const col = result[0].length
    const rotated: number[][] = []
    for (let c = 0; c < col; c++) {
      const newRow: number[] = []
      for (let r = row - 1; r >= 0; r--) {
        newRow.push(result[r][c])
      }
      rotated.push(newRow)
    }
    result = rotated
  }
  return result
}

const createEmptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0))

const mergePieceToBoard = (board: number[][], piece: Piece) => {
  const next = board.map((row) => row.slice())
  piece.blocks.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        next[piece.y + y][piece.x + x] = piece.shapeIndex + 1
      }
    })
  })
  return next
}

const buildDisplayBoard = (board: number[][], piece: Piece | null) => {
  if (!piece) return board
  return mergePieceToBoard(board, piece)
}

const createPreview = (shape: number[][]) => {
  const grid = Array.from({ length: 4 }, () => Array(4).fill(0))
  shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell && y < 4 && x < 4) {
        grid[y][x] = 1
      }
    })
  })
  return grid
}

Component({
  data: {
    board: createEmptyBoard(),
    displayBoard: createEmptyBoard(),
    current: null as Piece | null,
    nextShape: 0,
    nextPreview: createPreview(SHAPES[0]),
    status: 'idle' as Status,
    statusText: '待开始',
    score: 0,
    lines: 0,
    level: 1,
    message: '点击开始按钮开始游戏',
  },
  lifetimes: {
    attached() {
      const loggedIn = wx.getStorageSync('loggedIn')
      if (!loggedIn) {
        wx.redirectTo({ url: '/pages/login/login' })
      }
    },
    detached() {
      this.stopTimer()
    },
  },
  gameTimer: null as number | null,
  methods: {
    startGame() {
      const shapeIndex = this.randomShape()
      const nextShape = this.randomShape()
      const piece = this.createPiece(shapeIndex, 0)
      const board = createEmptyBoard()
      const preview = createPreview(rotateMatrix(SHAPES[nextShape], 0))
      this.stopTimer()
      this.setData({
        board,
        displayBoard: buildDisplayBoard(board, piece),
        current: piece,
        nextShape,
        nextPreview: preview,
        status: 'running',
        statusText: '进行中',
        score: 0,
        lines: 0,
        level: 1,
        message: '点击控制按钮移动或旋转方块',
      })
      this.startTimer()
    },
    togglePause() {
      if (this.data.status === 'running') {
        this.setData({ status: 'paused', statusText: '已暂停', message: '点击继续重新开始下落' })
      } else if (this.data.status === 'paused') {
        this.setData({ status: 'running', statusText: '进行中', message: '小心别堆满啦' })
      }
    },
    moveLeft() {
      this.movePiece(-1, 0)
    },
    moveRight() {
      this.movePiece(1, 0)
    },
    softDrop() {
      if (this.data.status !== 'running') return
      const moved = this.movePiece(0, 1)
      if (moved) {
        this.addScore(1)
      }
    },
    hardDrop() {
      if (this.data.status !== 'running' || !this.data.current) return
      let moved = false
      while (this.movePiece(0, 1)) {
        moved = true
        this.addScore(2)
      }
      if (moved) {
        this.lockPiece()
      }
    },
    rotatePiece() {
      if (this.data.status !== 'running' || !this.data.current) return
      const { current, board } = this.data
      const nextRotation = (current.rotation + 1) % 4
      const rotatedBlocks = rotateMatrix(SHAPES[current.shapeIndex], nextRotation)
      const rotated: Piece = { ...current, rotation: nextRotation, blocks: rotatedBlocks }
      if (!this.collides(rotated, board)) {
        this.updateCurrent(rotated)
      }
    },
    startTimer() {
      this.stopTimer()
      const interval = Math.max(150, 700 - (this.data.level - 1) * 60)
      this.gameTimer = setInterval(() => {
        if (this.data.status === 'running') {
          this.tick()
        }
      }, interval) as unknown as number
    },
    stopTimer() {
      if (this.gameTimer) {
        clearInterval(this.gameTimer)
        this.gameTimer = null
      }
    },
    tick() {
      if (!this.movePiece(0, 1)) {
        this.lockPiece()
      }
    },
    movePiece(dx: number, dy: number) {
      if (this.data.status !== 'running' || !this.data.current) return false
      const { current, board } = this.data
      const moved: Piece = { ...current, x: current.x + dx, y: current.y + dy }
      if (!this.collides(moved, board)) {
        this.updateCurrent(moved)
        return true
      }
      return false
    },
    collides(piece: Piece, board: number[][]) {
      for (let y = 0; y < piece.blocks.length; y++) {
        for (let x = 0; x < piece.blocks[y].length; x++) {
          if (!piece.blocks[y][x]) continue
          const newX = piece.x + x
          const newY = piece.y + y
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true
          if (newY >= 0 && board[newY][newX]) return true
        }
      }
      return false
    },
    lockPiece() {
      const { current, board } = this.data
      if (!current) return
      const merged = mergePieceToBoard(board, current)
      const { cleared, nextBoard } = this.clearLines(merged)
      const newLines = this.data.lines + cleared
      const newLevel = Math.max(1, Math.floor(newLines / 10) + 1)
      const nextShape = this.data.nextShape
      const newPiece = this.createPiece(nextShape, 0)
      const upcoming = this.randomShape()
      if (this.collides(newPiece, nextBoard)) {
        this.stopTimer()
        this.setData({
          board: nextBoard,
          displayBoard: nextBoard,
          current: null,
          status: 'over',
          statusText: '已结束',
          message: '堆满了！点击开始重来',
        })
        return
      }
      this.setData({
        board: nextBoard,
        current: newPiece,
        nextShape: upcoming,
        nextPreview: createPreview(SHAPES[upcoming]),
        lines: newLines,
        level: newLevel,
      })
      this.addScore(cleared > 0 ? cleared * 100 : 0)
      this.updateDisplayBoard()
      this.startTimer()
    },
    clearLines(board: number[][]) {
      const remaining: number[][] = []
      let cleared = 0
      for (let y = 0; y < board.length; y++) {
        const full = board[y].every((cell) => cell !== 0)
        if (full) {
          cleared++
        } else {
          remaining.push(board[y])
        }
      }
      while (remaining.length < ROWS) {
        remaining.unshift(Array(COLS).fill(0))
      }
      return { cleared, nextBoard: remaining }
    },
    updateCurrent(piece: Piece) {
      this.setData({
        current: piece,
        displayBoard: buildDisplayBoard(this.data.board, piece),
      })
    },
    updateDisplayBoard() {
      this.setData({
        displayBoard: buildDisplayBoard(this.data.board, this.data.current),
      })
    },
    createPiece(shapeIndex: number, rotation: number): Piece {
      const blocks = rotateMatrix(SHAPES[shapeIndex], rotation)
      return {
        shapeIndex,
        rotation,
        x: 3,
        y: 0,
        blocks,
      }
    },
    randomShape() {
      return Math.floor(Math.random() * SHAPES.length)
    },
    addScore(amount: number) {
      if (amount <= 0) {
        this.updateDisplayBoard()
        return
      }
      this.setData({ score: this.data.score + amount })
      this.updateDisplayBoard()
    },
  },
})
