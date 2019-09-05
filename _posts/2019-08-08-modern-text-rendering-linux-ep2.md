---
layout: post
title: "Modern text rendering with Linux: Antialiasing"
author: andrea
---

## Introduction

Welcome to part 2 of Modern text rendering in Linux. Check out the other posts
in the series:
[part 1]({{ site.baseurl }}{% post_url 2019-07-18-modern-text-rendering-linux-ep1 %}) and
[Overview]({{ site.baseurl }}{% post_url 2019-07-24-modern-text-rendering-linux-overview %}).

In this post I will show how to render a glyph to an image and the differences
between grayscale and LCD (subpixel) antialiasing.

## Setup

I will use the same code, OS, compiler and libraries used in
[part 1]({{ site.baseurl }}{% post_url 2019-07-18-modern-text-rendering-linux-ep1 %})
and extend the code.

This will be our final result. And [here](https://gist.github.com/mrandri19/fe5dc2709d761568d749f8125d0f4490) is the code.

<div style="display: flex; flex-direction: row; justify-content: space-evenly;">
<figure style="display: inline-block;">
<img src="/assets/images/modern-text-rendering-linux-ep2/grayscale.jpg"
style="min-height: 8rem;image-rendering: pixelated;image-rendering: crisp-edges; margin: auto;"/>
<figcaption style="text-align: center; margin-top: 1rem;">A grayscale antialiased glyph</figcaption>
</figure>

<figure style="display: inline-block;">
<img src="/assets/images/modern-text-rendering-linux-ep2/lcd.jpg"
style="min-height: 8rem;image-rendering: pixelated;image-rendering: crisp-edges; margin: auto;"/>
<figcaption style="text-align: center; margin-top: 1rem;">A subpixel antialiased glyph</figcaption>
</figure>
</div>

Let's start right back from where we stopped last time:

```shell
$ clang -I/usr/include/freetype2 \
        -I/usr/include/libpng16  \
        -Wall -Werror            \
        -o main                  \
        -lfreetype               \
         main.c && ./main
FreeType's version is 2.8.1
   .*****.
  .********.
  .*********
   .     ***.
          ***
          ***
    .********
  ***********
 .**.     ***
 ***      ***
 ***      ***
 ***.     ***
 .***********
  ***********
   .*******..
```

### Including stb_image_write

To render a glyph to a JPG image we will use nothing's
[stb_image_write](https://raw.githubusercontent.com/nothings/stb/master/stb_image_write.h).

In the same folder as `main.c` run:

```shell
$ wget https://raw.githubusercontent.com/nothings/stb/master/stb_image_write.h
```

If wget is not installed run `sudo apt install wget` to install it
and then retry the previous command.

In `main.c` add the library to the includes.

```diff
 #include <freetype2/ft2build.h>
 #include FT_FREETYPE_H
+
+ #define STB_IMAGE_WRITE_IMPLEMENTATION
+ #include "./stb_image_write.h"
+
 int main() {
```

### Rendering a Grayscale Antialiased Glyph

First of all extract `face->glyph->bitmap` to a variable to make the
code tidier.

```diff
+  FT_Bitmap bitmap = face->glyph->bitmap;
-  for (size_t i = 0; i < face->glyph->bitmap.rows; i++) {
-   for (size_t j = 0; j < face->glyph->bitmap.width; j++) {
-     unsigned char pixel_brightness =
-         face->glyph->bitmap.buffer[i * face->glyph->bitmap.pitch + j];
+  for (size_t i = 0; i < bitmap.rows; i++) {
+    for (size_t j = 0; j < bitmap.width; j++) {
+      unsigned char pixel_brightness = bitmap.buffer[i * bitmap.pitch + j];

     if (pixel_brightness > 169) {
       printf("*");
     } else if (pixel_brightness > 84) {
       printf(".");
     } else {
       printf(" ");
     }
   }
   printf("\n");
 }
```

Create a buffer for the image data (remember to `free` it at the end).

```diff
  FT_Bitmap bitmap = face->glyph->bitmap;
+
+ unsigned char* data =
+     malloc(bitmap.width * bitmap.rows * sizeof(unsigned char*));
+
  for (size_t i = 0; i < bitmap.rows; i++) {
```

Delete the printing instructions and copy the pixel data into the buffer.

```diff
  for (size_t i = 0; i < bitmap.rows; i++) {
    for (size_t j = 0; j < bitmap.width; j++) {
-     unsigned char pixel_brightness = bitmap.buffer[i * bitmap.pitch + j];
+     data[i * bitmap.width + j] = bitmap.buffer[i * bitmap.pitch + j];
+
-     if (pixel_brightness > 169) {
-       printf("*");
-     } else if (pixel_brightness > 84) {
-       printf(".");
-     } else {
-       printf(" ");
-     }
    }
-   printf("\n");
  }
```

Finally, write the image to a JPG file called `image.jpg`.

```diff
  }
+
+ stbi_write_jpg("image.jpg", bitmap.width, bitmap.rows, 1, data, 100);
+
  return 0;
```

`image.jpg` should look like this.

<div style="display: flex; flex-direction: row; justify-content: space-evenly;">
   <figure style="display: inline-block;">
      <img src="/assets/images/modern-text-rendering-linux-ep2/grayscale.jpg"
      style="min-height: 8rem;image-rendering: pixelated; margin: auto;"/>
   </figure>
</div>

### Rendering a LCD (Subpixel) Antialiased Glyph

Changing the antialiasing technique is easy with FreeType.

Add this header to include the LCD filtering functionality.

```diff
  #include FT_FREETYPE_H
+ #include FT_LCD_FILTER_H

  #define STB_IMAGE_WRITE_IMPLEMENTATION
```

Set which LCD filter to use. For a
list of filters check the
[FreeType docs](https://www.freetype.org/freetype2/docs/reference/ft2-lcd_rendering.html)
on Subpixel Rendering. We will use the default one.

```diff
  FT_Int major, minor, patch;
  FT_Library_Version(ft, &major, &minor, &patch);
  printf("FreeType's version is %d.%d.%d\n", major, minor, patch);
+
+  FT_Library_SetLcdFilter(ft, FT_LCD_FILTER_DEFAULT);
+
  FT_Face face;
```

Change the render mode to LCD.
[Here](https://www.freetype.org/freetype2/docs/reference/ft2-base_interface.html#ft_render_mode)
is a list of the available render modes.

```diff
- FT_Int32 render_flags = FT_RENDER_MODE_NORMAL;
+ FT_Int32 render_flags = FT_RENDER_MODE_LCD;
```

`image.jpg` should look like this.

<div style="display: flex; flex-direction: row; justify-content: space-evenly;">
   <figure style="display: inline-block;">
      <img src="/assets/images/modern-text-rendering-linux-ep2/thicc.jpg"
      style="min-height: 8rem;image-rendering: pixelated; margin: auto;"/>
   </figure>
</div>

What happened? LCD Antialiasing works by treating each pixel as three
separate light sources, each one capable of emitting either Red, Green, or Blue light.
Grayscale Antialiasing instead treats each pixel as a single light source, emitting
white light.

We will explain how this works in detail later, but for now what we care about
is that LCD AA triples the horizontal resolution of the image.

Let's change the code so that we see a colored image where each pixel is composed
of three channels: R,G,B.

```diff
- stbi_write_jpg("image.jpg", bitmap.width, bitmap.rows, 1, data, 100);
+ stbi_write_jpg("image.jpg", bitmap.width / 3, bitmap.rows, 3, data, 100);
```

`image.jpg` should look like this.

<div style="display: flex; flex-direction: row; justify-content: space-evenly;">
   <figure style="display: inline-block;">
      <img src="/assets/images/modern-text-rendering-linux-ep2/lcd.jpg"
      style="min-height: 8rem;image-rendering: pixelated; margin: auto;"/>
   </figure>
</div>

You can find the complete code [here](https://gist.github.com/mrandri19/fe5dc2709d761568d749f8125d0f4490).

## How do they work?

Draw on the grids, then click **sample** to see how the different antialiasing tecniques work.
Try drawing the same shape in both, for example an 'A', and then compare the results.

<div style="
    display: flex;
    flex-flow: row wrap;
    justify-content: space-around;
    text-align: center;
    margin-bottom: 1.5rem;">
  <div>
    <p style="margin: auto;">Grayscale</p>
    <canvas id="canvas-grayscale" style="display: block;"></canvas>
    <button id="sample-grayscale" class="my-button">Sample</button>
    <button id="clear-grayscale" class="my-button">Clear</button>
    <script src="/assets/js/modern-text-rendering-linux-ep2modern-text-rendering-linux-ep2/grayscale.js"></script>
  </div>

  <div>
    <p style="margin: auto;">LCD</p>
    <canvas id="canvas-lcd" style="display: block;"></canvas>
    <button id="sample-lcd" class="my-button">Sample</button>
    <button id="clear-lcd" class="my-button">Clear</button>
    <script src="/assets/js/modern-text-rendering-linux-ep2modern-text-rendering-linux-ep2/lcd.js"></script>
  </div>
</div>

What you should be seeing after drawing and clicking sample.

<div style="display: flex; flex-direction: row; justify-content: space-evenly;">
   <figure style="display: inline-block;">
      <img src="/assets/images/modern-text-rendering-linux-ep2/interactive-example-screenshot.png"
      style="min-height: 8rem;image-rendering: pixelated; margin: auto;"/>
      <figcaption style="text-align: center; margin-top: 1rem;"></figcaption>
   </figure>
</div>

### Grayscale Antialiasing

<div style="display: flex; flex-direction: row; justify-content: space-evenly;">
   <figure style="display: inline-block;">
      <img src="/assets/images/modern-text-rendering-linux-ep2/rasterization-strategies.png"
      style="min-height: 8rem;image-rendering: pixelated; margin: auto;"/>
      <figcaption style="text-align: center; margin-top: 1rem;">Ideal shape, monochrome and grayscale antialiasing<br>
        Image taken from <a href="https://www.smashingmagazine.com/2012/04/a-closer-look-at-font-rendering/">Smashing Magazine</a>
      </figcaption>
   </figure>
</div>

Grayscale Antialiasing divides the image to render in a grid, then, for
each square in the grid, counts how much the area of a grid's square is covered by
the image. If 100% of the square is covered then the pixel will have 100%
opacity, if 50% of the square is covered then the pixel will be half-transparent.

### LCD (Subpixel) Antialiasing

<div style="display: flex; flex-direction: row; justify-content: space-evenly;">
   <figure style="display: inline-block;">
      <img src="/assets/images/modern-text-rendering-linux-ep2/rasterization-subpixel.png"
      style="min-height: 8rem;image-rendering: pixelated; margin: auto;"/>
      <figcaption style="text-align: center; margin-top: 1rem;">An LCD
      antialiased glyph, showing an RGB image, showing its individual
      subpixels, showing each subpixel's brightness. The white square
      represents a single pixel.<br>
        Image taken from <a href="https://www.smashingmagazine.com/2012/04/a-closer-look-at-font-rendering/">Smashing Magazine</a>
      </figcaption>
   </figure>
</div>

LCD Antialiasing exploits the fact that each pixel is made of three independent
light sources, usually thin rectangles, which we call subpixels. By knowing
the order (Red Green Blue or Blue Green Red) in which these subpixels form a pixel, we can turn them on individually
to triple the horizontal resolution.

The main downside of this method is that when rendering an image, you need to know the
order in which subpixels are placed on the screen, which may not be available.
Also think of a phone screen being rotated 90 degrees, the images need to be re-rendered (or at least re-antialiased)
because the subpixels are now one on top of the other instead of side by side.
This is the reason why iOS doesn't use subpixel rendering while macOS pre 10.14 does.

## Sources

- [A closer look at font rendering](https://www.smashingmagazine.com/2012/04/a-closer-look-at-font-rendering/) by Smashing Magazine
- [Sub-pixel, gamma correct, font rendering](http://www.puredevsoftware.com/blog/2019/01/22/sub-pixel-gamma-correct-font-rendering/) by Puredev Software
- [Font Rasterization](https://web.archive.org/web/20180921225907/http://antigrain.com/research/font_rasterization/index.html#FONT_RASTERIZATION) by The AGG Project
