---
layout: post
title: I built a thing
author: Andrea Cognolato

---
I have built the thing I was talking about 3 days ago. A balancing beam made of wood, zip ties and bitterness.

I have tried to control the motor manually with a potentiometer and it works, so hooray🎉🎉. Now the next steps are:

* Calibrate the ESC
* Calibrate the IMU (Both accelerometer and gyroscope)
  * Also find out if the DMP is really worth using, how about a complementary + low pass filter. How about a kalman filter?
* Code a PID controller to control this thing, hopefully having the IMU not exactly at the center isn't really a problem.

![](/uploads/dscf8017.jpg)