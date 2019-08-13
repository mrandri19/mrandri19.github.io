---
layout: post
title: "Modern text rendering with Linux: Part 2"
author: andrea
---

## Introduction

Welcome to part 2 of Modern text rendering in Linux. Check out the other posts
in the series:
[part 1]({{ site.baseurl }}{% post_url 2019-07-18-modern-text-rendering-linux-ep1 %}) and
[Overview]({{ site.baseurl }}{% post_url 2019-07-24-modern-text-rendering-linux-overview %}).

In this post I will show how to render a glyph to an image, the differences
between grayscale and LCD (subpixel) antialiasing, and then discuss gamma encoding
and LCD filtering.

## Setup

I will use the same code, OS, compiler and libraries used in
[part 1]({{ site.baseurl }}{% post_url 2019-07-18-modern-text-rendering-linux-ep1 %})
and extend the code.

This will be our final result.

<div style="display: flex; flex-direction: row; justify-content: space-evenly;">
<figure style="display: inline-block;">
<img src="/assets/images/modern-text-rendering-linux-ep2/grayscale.jpg"
style="min-height: 8rem;image-rendering: pixelated; margin: auto;"/>
<figcaption style="text-align: center; margin-top: 1rem;">A grayscale antialiased glyph</figcaption>
</figure>

<figure style="display: inline-block;">
<img src="/assets/images/modern-text-rendering-linux-ep2/lcd.jpg"
style="min-height: 8rem;image-rendering: pixelated; margin: auto;"/>
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

## How do they work?

Draw on the grids, then click the sample button.

<div style="
    display: flex;
    flex-flow: row wrap;
    justify-content: space-around;
    text-align: center;">
  <style>
    .my-button {
      align-items:center;
      background-color:rgb(255, 255, 255);
      border-bottom-color:rgb(219, 219, 219);
      border-bottom-left-radius:4px;
      border-bottom-right-radius:4px;
      border-bottom-style:solid;
      border-bottom-width:1px;
      border-image-outset:0px;
      border-image-repeat:stretch;
      border-image-slice:100%;
      border-image-source:none;
      border-image-width:1;
      border-left-color:rgb(219, 219, 219);
      border-left-style:solid;
      border-left-width:1px;
      border-right-color:rgb(219, 219, 219);
      border-right-style:solid;
      border-right-width:1px;
      border-top-color:rgb(219, 219, 219);
      border-top-left-radius:4px;
      border-top-right-radius:4px;
      border-top-style:solid;
      border-top-width:1px;
      box-shadow:none;
      box-sizing:border-box;
      color:rgb(54, 54, 54);
      cursor:pointer;
      display:flex;
      font-family:BlinkMacSystemFont, -apple-system, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size:16px;
      font-weight:400;
      height:36px;
      justify-content:center;
      line-height:24px;
      margin-bottom:8px;
      padding-bottom:5px;
      padding-left:12px;
      padding-right:12px;
      padding-top:5px;
      position:relative;
      text-align:center;
      text-decoration-color:rgb(54, 54, 54);
      text-decoration-line:none;
      text-decoration-style:solid;
      text-size-adjust:100%;
      user-select:none;
      vertical-align:top;
      white-space:nowrap;
      width:76.75px;
      -webkit-appearance:none;
      margin: auto;
      margin-top: 1rem;
     }
  </style>
  <div>
    <p style="margin: auto;">Grayscale</p>
    <canvas width="301" height="301" id="canvas-grayscale" style="display: block;"></canvas>
    <button id="sample-grayscale" class="my-button">Sample</button>
    <script src="/assets/js/modern-text-rendering-linux-ep2modern-text-rendering-linux-ep2/grayscale.js"></script>
  </div>

  <div>
    <p style="margin: auto;">LCD</p>
    <canvas width="301" height="301" id="canvas-lcd" style="display: block;"></canvas>
    <button id="sample-lcd" class="my-button">Sample</button>
    <script src="/assets/js/modern-text-rendering-linux-ep2modern-text-rendering-linux-ep2/lcd.js"></script>
  </div>
</div>

TODO: Finish
