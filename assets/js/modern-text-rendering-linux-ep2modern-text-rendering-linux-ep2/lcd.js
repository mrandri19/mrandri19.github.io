(() => {
  const l = console.log
  function get_x_y({ clientX, clientY }) {
    const { left, top } = canvas.getBoundingClientRect()

    const x = clientX - left;
    const y = clientY - top;
    return [x, y]
  }

  const canvas = document.getElementById('canvas-lcd')
  const ctx = canvas.getContext('2d')

  const w = canvas.width
  const h = canvas.height

  // Draw bg
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, w, h)

  const grid_edge = 20

  function draw_grid() {
    const old_lineWidth = ctx.lineWidth
    const old_strokeStyle = ctx.strokeStyle

    ctx.strokeStyle = "#999999"
    ctx.lineWidth = 1

    ctx.beginPath()
    for (let x = 0; x < w; x += grid_edge) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < w; y += grid_edge) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    ctx.closePath()

    ctx.strokeStyle = old_strokeStyle
    ctx.lineWidth = old_lineWidth
  }
  draw_grid()

  // Paint with mouse
  function setup_mouse_painting() {
    ctx.lineWidth = 25
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = "#000000"

    let x, y;
    let mouse_down = false;
    canvas.onmousedown = e => {
      mouse_down = true;
      ctx.beginPath()

      const [new_x, new_y] = get_x_y(e)

      x = new_x
      y = new_y
    }
    canvas.onmouseup = e => {
      mouse_down = false;
      ctx.closePath()

      const [new_x, new_y] = get_x_y(e)

      x = new_x
      y = new_y
    }
    canvas.onmousemove = e => {
      const [new_x, new_y] = get_x_y(e)

      if (mouse_down) {
        ctx.moveTo(x, y)
        ctx.lineTo(new_x, new_y)
        ctx.stroke()
      }

      x = new_x
      y = new_y
    }
    canvas.onmouseout = () => {
      mouse_down = false
    }
  }
  setup_mouse_painting()


  function sample() {
    const image_data = ctx.getImageData(0, 0, w, h)
    const { data } = image_data

    // For each grid square
    for (let grid_x = 0; grid_x < w; grid_x += grid_edge) {
      for (let grid_y = 0; grid_y < h; grid_y += grid_edge) {

        let count_left = 0;
        let count_center = 0;
        let count_right = 0;

        for (let i = grid_x; i < Math.round(grid_x + grid_edge / 3); i++) {
          for (let j = grid_y; j < grid_edge + grid_y; j++) {
            if (data[(i * 4 * w) + j * 4 + 0] == 0x00 &&
              data[(i * 4 * w) + j * 4 + 1] == 0x00 &&
              data[(i * 4 * w) + j * 4 + 2] == 0x00) {
              count_left++;
            }
          }
        }
        for (let i = Math.round(grid_x + grid_edge / 3);
          i < Math.round(grid_x + 2 * grid_edge / 3);
          i++) {
          for (let j = grid_y; j < grid_edge + grid_y; j++) {
            if (data[(i * 4 * w) + j * 4 + 0] == 0x00 &&
              data[(i * 4 * w) + j * 4 + 1] == 0x00 &&
              data[(i * 4 * w) + j * 4 + 2] == 0x00) {
              count_center++;
            }
          }
        }
        for (let i = Math.round(grid_x + 2 * grid_edge / 3);
          i < grid_x + grid_edge;
          i++) {
          for (let j = grid_y; j < grid_edge + grid_y; j++) {
            if (data[(i * 4 * w) + j * 4 + 0] == 0x00 &&
              data[(i * 4 * w) + j * 4 + 1] == 0x00 &&
              data[(i * 4 * w) + j * 4 + 2] == 0x00) {
              count_right++;
            }
          }
        }

        for (let i = grid_x;
          i < grid_edge + grid_x;
          i++) {
          for (let j = grid_y; j < grid_edge + grid_y; j++) {
            // We assume that red pixels are on the left, green in the
            // center and blue on the right
            data[(i * 4 * w) + j * 4 + 0] =
              Math.round((1 - count_left / (grid_edge * grid_edge / 3)) * 256)
            data[(i * 4 * w) + j * 4 + 1] =
              Math.round((1 - count_center / (grid_edge * grid_edge / 3)) * 256)
            data[(i * 4 * w) + j * 4 + 2] =
              Math.round((1 - count_right / (grid_edge * grid_edge / 3)) * 256)
            data[(i * 4 * w) + j * 4 + 3] = 0xff
          }
        }
      }
    }

    ctx.putImageData(image_data, 0, 0)

    draw_grid()
  }

  const button = document.getElementById('sample-lcd')
  button.onclick = sample
})()