(() => {
  function get_x_y(e) {
    // Disable scrolling on touch events, and selections on double click
    e.preventDefault();

    let { clientX, clientY } = e;

    // clientX/Y are NaN on touch events, so use the correct one
    if (isNaN(clientX) || isNaN(clientY)) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    const { left, top } = canvas.getBoundingClientRect();

    const x = clientX - left;
    const y = clientY - top;
    return [x, y];
  }

  const canvas = document.getElementById("canvas-grayscale");
  const ctx = canvas.getContext("2d");

  canvas.setAttribute("width", 300);
  canvas.setAttribute("height", 300);
  const w = canvas.width;
  const h = canvas.height;

  const grid_edge = 20;

  function draw_grid(strokeStyle) {
    const old_lineWidth = ctx.lineWidth;
    const old_strokeStyle = ctx.strokeStyle;

    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = grid_edge; x < w; x += grid_edge) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = grid_edge; y < w; y += grid_edge) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.closePath();

    ctx.strokeStyle = old_strokeStyle;
    ctx.lineWidth = old_lineWidth;
  }

  function clear() {
    // Draw bg
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    draw_grid("#777777");
  }
  clear();

  // Paint with mouse
  function setup_mouse_painting() {
    ctx.lineWidth = 25;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";

    let x, y;
    let mouse_down = false;
    canvas.onmousedown = canvas.ontouchstart = e => {
      mouse_down = true;
      ctx.beginPath();

      const [new_x, new_y] = get_x_y(e);

      x = new_x;
      y = new_y;
    };
    canvas.onmouseup = canvas.ontouchend = e => {
      mouse_down = false;
      ctx.closePath();

      const [new_x, new_y] = get_x_y(e);

      x = new_x;
      y = new_y;
    };
    canvas.onmousemove = canvas.ontouchmove = e => {
      const [new_x, new_y] = get_x_y(e);

      if (mouse_down) {
        ctx.moveTo(x, y);
        ctx.lineTo(new_x, new_y);
        ctx.stroke();
      }

      x = new_x;
      y = new_y;
    };
    canvas.onmouseout = () => {
      mouse_down = false;
    };
  }
  setup_mouse_painting();

  function sample() {
    function is_black(data, i, j, w, h) {
      return (
        data[i * 4 * w + j * 4 + 0] == 0x00 &&
        data[i * 4 * w + j * 4 + 1] == 0x00 &&
        data[i * 4 * w + j * 4 + 2] == 0x00
      );
    }
    const R = Math.round;
    const edge_third = grid_edge / 3;
    const pixels_in_third = grid_edge * edge_third;

    const image_data = ctx.getImageData(0, 0, w, h);
    const { data } = image_data;

    // For each square in the grid
    for (let grid_y = 0; grid_y < h; grid_y += grid_edge) {
      for (let grid_x = 0; grid_x < w; grid_x += grid_edge) {
        let count = 0;

        // For each pixel in the 1st third of the square
        for (let i = grid_y; i < grid_edge + grid_y; i++) {
          for (let j = grid_x; j < R(grid_x + grid_edge); j++) {
            if (is_black(data, i, j, w, h)) {
              count++;
            }
          }
        }

        // For each pixel in the 1st third of the square
        for (let i = grid_y; i < grid_edge + grid_y; i++) {
          for (let j = grid_x; j < R(grid_x + grid_edge); j++) {
            data[i * 4 * w + j * 4 + 0] = R((count / pixels_in_third) * 256);
            data[i * 4 * w + j * 4 + 1] = R((count / pixels_in_third) * 256);
            data[i * 4 * w + j * 4 + 2] = R((count / pixels_in_third) * 256);
            data[i * 4 * w + j * 4 + 3] = 0xff;
          }
        }
      }
    }

    ctx.putImageData(image_data, 0, 0);
    draw_grid("#999999");
  }

  const sample_button = document.getElementById("sample-grayscale");
  sample_button.onclick = sample;

  const clear_button = document.getElementById("clear-grayscale");
  clear_button.onclick = clear;
})();
