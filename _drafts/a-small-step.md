---
layout: post
title: A small step...
author: Andrea Cognolato

---
After a day of calibrating the ESC and I think I have finally figured out how to control this thing decently. Gone are the days of using a potentiometer to set the speed of the motor, I need to be much, much gentler.

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
ms = clamp(1.0f, ms, 1.08f);
uint32_t duty_cycle = ms_to_duty(ms);

printf("ms: %f\n", ms);

ESP_ERROR_CHECK(ledc_set_duty(SPEED_MODE, CHANNEL, duty_cycle));
ESP_ERROR_CHECK(ledc_update_duty(SPEED_MODE, CHANNEL));
```