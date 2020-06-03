---
layout: post
title: A small step...
author: Andrea Cognolato

---
After a day of calibrating the ESC and I think I have finally figured out how to control this thing decently. Gone are the days of using a potentiometer to set the speed of the motor, I need to be much, much gentler.

F in the chat for our first propeller...
![](/uploads/img_20200603_212939_749.jpg)

I have decided to instead use my laptop to increase and decrease the throttle of the motor.

Using esp-idf's UART events, at each iteration of the loop, I check if new data is available. Using that data I modify the `ms` variable which specifies how many milliseconds the PWM signal should stay high. Notice how the increments are 500 ns wide, this is how gentle I need to be.

```cpp
if (xQueueReceive(uart0_queue, (void *)&event,
                  (portTickType)pdMS_TO_TICKS(0))) {
  bzero(dtmp, RD_BUF_SIZE);
  switch (event.type) {
    case UART_DATA:
      uart_read_bytes(UART_NUM, dtmp, event.size, portMAX_DELAY);
      if (dtmp[0] == 'w') {
        ms += 0.0005;
      }
      if (dtmp[0] == 's') {
        ms -= 0.0005;
      }
      break;
    default:
      ESP_LOGI(TAG, "uart event type: %d", event.type);
      break;
  }
}
```

To avoid disasters I clamp the possible range of values between 1 ms and 1.08 ms. By trial and error I have found that 1.08 ms is the maximum power I need to use without risking to damage my testing board or myself.

```cpp
ms = clamp(1.0f, ms, 1.08f);
uint32_t duty_cycle = ms_to_duty(ms);
```

I am using esp-idf ledc to control the PWM. I could use mcpwm but seems much more powerful than what I need. Still it would be nice not to use the ESCs and directly control the motors with mcpwm and a H-Bridge

```cpp
printf("ms: %f\n", ms);

ESP_ERROR_CHECK(ledc_set_duty(SPEED_MODE, CHANNEL, duty_cycle));
ESP_ERROR_CHECK(ledc_update_duty(SPEED_MODE, CHANNEL));
```