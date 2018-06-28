---
layout: post
title:  "Hacking with the nim language on a ESP32 board"
---

TODO: write it

# Notes

The command to remove the old c files generated from nim and copy the new ones.

```bash
rm \
  main/greetings.c \
  main/stdlib_system.c \
  main/greetings.h -f
```

```bash
cp \
  ~/Desktop/nim/nimcache/greetings.c \
  ~/Desktop/nim/nimcache/greetings.h \
  ~/Desktop/nim/nimcache/stdlib_system.c \
  main
```

The command to remove the `nimcache` and compile the code into c.

```bash
$ rm -rf nimcache
```

```bash
$ nim c \
  -c \
  --header \
  --cpu=i386 \
  --gc:none \
  --os:standalone \
  --deadCodeElim:on \
  --noMain \
  --stackTrace:off \
  --lineTrace:off \
  --profiler:off \
  --app:staticlib \
  --symbolFiles:off \
  --noLinking greetings.nim
```

The architectures we could provably use, right now we are using `i386`.

```nim
(name: "i386", intSize: 32, endian: littleEndian, floatSize: 64, bit: 32),
(name: "vm", intSize: 32, endian: littleEndian, floatSize: 64, bit: 32),
(name: "mipsel", intSize: 32, endian: littleEndian, floatSize: 64, bit: 32),
(name: "arm", intSize: 32, endian: littleEndian, floatSize: 64, bit: 32),
```
