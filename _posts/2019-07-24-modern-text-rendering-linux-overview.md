---
layout: post
title: "Modern text rendering with Linux: Overview"
---

## Introduction

Text an essential part of Human-computer Interaction. In the age of Instagram,
YouTube, and VR we still consume information primarily through text. Computing
started with text-only interfaces and every major Operating System provides
libraries to render text.

Text rendering, despite being ubiquitous, has little up to date documentation,
especially on Linux systems. The goal of this post is to give an overview of the
modern Linux text rendering stack and to give the reader an understanding of
the complexity behind it.

## Overview

<figure>
<img src="/assets/images/modern-text-rendering-linux-overview/overview.svg"
style="max-width: auto; display: block; margin: auto;"/>
<figcaption style="text-align: center; margin-top: 1rem;">The data flow of text rendering.</figcaption>
</figure>

The stack is composed of 4 components:

- [Fontconfig](https://www.freedesktop.org/wiki/Software/fontconfig/)
- [FriBidi](https://github.com/fribidi/fribidi) or [LibICU](http://site.icu-project.org/home)
- [HarfBuzz](https://www.freedesktop.org/wiki/Software/fontconfig/)
- [FreeType](https://www.freetype.org/)

### Fontconfig

<figure>
<img src="/assets/images/modern-text-rendering-linux-overview/fontconfig.svg"
style="max-width: auto; display: block; margin: auto;"/>
</figure>

Fontconfig takes a list of font properties (name, width, weight, style, etc.),
then selects a font file on your system which most closely matches the properties
you requested. It is configured with a XML-based language which allows you to
specify default fonts, whitelist or blacklist them, create bold and italic styles
for incomplete fonts, set the hinting and antialiasing levels and much more.
The [Arch Wiki](https://wiki.archlinux.org/index.php/Font_configuration) is an
excellent resource for creating or editing your configuration.

### FriBidi or LibICU

FriBidi and LibICU, among other things, provide an implementation of the [Unicode Bidirectional](http://www.unicode.org/reports/tr9/)
algorithm. The Unicode Bidirectional Algorithm allows you to convert between text
in _logical/storage_ format to text in _visual_ format. The W3C has a beautiful
[article](https://www.w3.org/International/articles/inline-bidi-markup/uba-basics)
on it.

Consider the following example, where Arabic or Hebrew letters are represented by uppercase
English letters and English text is represented by lowercase letters:

In the rendered text, the English letter h is visually followed by the Arabic letter C,
but logically h is followed by the rightmost letter A. The next letter, in logical order,
will be R. In other words, the logical/storage order of the same text would be:

```
english ARABIC text
```

But the rendered version also called visual format would be:

```
english CIBARA text
```

Because Arabic or Hebrew are Right-To-Left languages whereas English is Left-To-Right.

(Example taken from [http://userguide.icu-project.org/transforms/bidi](http://userguide.icu-project.org/transforms/bidi))

### HarfBuzz

<figure>
<img src="/assets/images/modern-text-rendering-linux-overview/harfbuzz.svg"
style="max-width: auto; display: block; margin: auto;"/>
</figure>

HarfBuzz is the text shaping engine: it maps codepoints from a string to their
corresponding glyph indices.
HarfBuzz takes a Unicode string, three properties: direction, script, language, and a font. It returns a list of glyph indices, each with a position in x, y coordinates, which incorporates kerning data from the font's GPOS table.

Examples:

`Hello, world` becomes `43 72 79 79 82 15 3 90 82 85 79 71` with font: Ubuntu Mono

`->` becomes `16 33` with font: Ubuntu Mono

`->` becomes `1603 1064` with font: Fira Code Retina

HarfBuzz is essential to correctly handle accents, emojis, ligatures and almost
every language except English.

### FreeType

<figure>
<img src="/assets/images/modern-text-rendering-linux-overview/freetype.svg"
style="max-width: auto; display: block; margin: auto;"/>
</figure>

FreeType is the text rendering engine: it takes a glyph index and a font, then renders an image of that glyph index. It also provides basic kerning support.
You can configure it by specifying the hinting level and which and how much antialiasing to use.

## Sources

- [State of Text Rendering](http://behdad.org/text/) by Behdad Esfahbod (2010)
- [Higher Quality 2D Text Rendering](https://hal.inria.fr/hal-00821839/document) by Nicolas Rougier (2013)
- [Digital Typography - SIGGRAPH 2018](https://www.slideshare.net/NicolasRougier1/siggraph-2018-digital-typography) by Behdad Esfahbod and Nicolas Rougier (2018)
- [Linux Font Rendering Stack](https://www.youtube.com/watch?v=wzEZhzeRjFk) by Max Harmathy (2018)
