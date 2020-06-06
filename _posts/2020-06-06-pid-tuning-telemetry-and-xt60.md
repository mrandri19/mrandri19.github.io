---
layout: post
title: PID tuning, telemetry and XT60
author: Andrea Cognolato

---
I have spent the last few days implementing PID control for the drone, making some adjustments to the frame to have less friction, implementing some telemetry software to see pretty charts in my browser, and switching from Deans connectors to XT60.

## PID Control

This 1-motor system is pretty hard to control. You can regulate the speed of the motor, which is proportional to their thrust, and you want to control the shaft's angle. This means that to control the angle you act on its second derivative i.e. angular acceleration. In addition, you can only go up: when you exceed the desired angle, you can't just reverse the motor's direction fix it, you need to wait for gravity to bring you down. I hope that a 2-motor setup will make this easier.

Anyway, I have used a simple PID controller. The input `y_des` is the angle we want, the output `y` is the angle measured by the IMU, the command `u` is how many milliseconds the PWM signal should stay on for. To find the constants I have used the standard Ziegler-Nichols method.

## Less friction

I have changed my wiring and screws to have less friction. In the future I will use some kind of spherical joint to improve the friction and be able to test the quadcopter on all 6 axes.

## Telemetry

I have written a rust program which reads data from a serial connection and broadcast it to a list of clients connected using websockets. To build it I have used a fantastic library called [ring channel](). The frontend uses [uPlot](https://github.com/brunocodutra/ring-channel) to display a simple realtime plot of the various errors (proportional, integral, and derivative) and the output action.

I have also seen [Uber's XVIZ](https://avs.auto/#/xviz/overview/introduction) protocol and I plan to use that in the future, especially if I get into SLAM or Visual Inertial Odometry and I need to visualize some point clouds.

## XT-60

Not much to say here, I have replaced the deans connectors on my battery to there. In the future (which means Thursday) I will use them to connect the battery to a Power Distribution Board.