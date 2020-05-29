---
layout: post
title: Indiana Jones and the forbidden DMP code
author: Andrea Cognolato

---
The [last time]() I had to read some data from an accelerometer it did not involve discovering reverse engineered microcode from 2011 (a.c.). Apparently the MPU6050 is full of surprises.

The MPU6050 is a 6-axis Inertial Movement Unit, or IMU. 3 axis come from the gyroscope which measures angular velocity, the other 3 come from the accelerometer which, you guessed it, measures acceleration. But we want neither of them, we just want to know if we are parallel to the floor and, if not, by how much we are off.

To obtain our orientation we want to know what our angles are with respect to the downward vector. At first sight an accelerometer seems enough, get three acceleration values, build a 3D vector, find the three angles that make the vector be (0, 0, 9.81) m/s^2.

This can and, in fact, work but gets you a very noisy measurement. When you rotate your device, the centripetal acceleration will skew your measurements until your device has stopped rotating. To solve this problem you can add a gyroscope and, with sensor fusion algorithms, merge the two readings to create a much better measurement.

But I don't want (for now) to implement a low pass filter, and perhaps a Kalman filter on my ESP32 to merge the sensors' data. The good news is that the MPU6050 has a Digital Motion Processor a.k.a DMP, the bad new is that Invensense really don't want you to use it (well, they have finally released it in 2014 so not too bad I guess, still, 5 years). Enter the scene [Noah Zerkin](https://twitter.com/noazark) which reverse engineered the firmware by sniffing the communication of a commerical device using a logic analyzer.

Thanks to him, this functionality was implemented in [ic2devlib]() and can be easily used with esp-idf. Since today I have no pretty pictures, here is a screenshot.

![](/uploads/image-2.jpg)

Next step: understanding **Quaternions**