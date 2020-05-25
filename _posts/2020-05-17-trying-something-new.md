---
layout: post
title: Trying something new
author: Andrea Cognolato

---
# Building an ESP32 drone

I want to try something new and document my drone build with short, perhaps daily or weekly, posts.

In the past week I have been working on making my two ESP32s communicate over WiFi and UDP. Both of them are [DOIT Esp32 DevKit v1](https://docs.zerynth.com/latest/official/board.zerynth.doit_esp32/docs/index.html)s.

The main challenge so far has been getting a low and predictable latency because, ideally, I want to be able to send a [PPM Signal](https://sourceforge.net/p/arduinorclib/wiki/PPM%20Signal/) over it. This means that I need to aim for around 1kHz and the lowest latency possible.

I still need to benchmark my solution (perhaps by writing a rust program?) but using [ESP-IDF]()'s uart events and UDP server seems to work well.