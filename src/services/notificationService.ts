import TelegramBot from 'node-telegram-bot-api';
import { Violation } from '../types';
import { CronJobExecutionResult, CronJobComparisonResult } from './cronJobExecutionService';
import config from '../config';

export interface NotificationData {
  chatId: number;
  plate: string;
  vehicleType: string;
  executionResult: CronJobExecutionResult;
  comparisonResult: CronJobComparisonResult;
}

export class NotificationService {
  private bot: TelegramBot;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  /**
   * Format cron schedule to Vietnamese description
   */
  private formatCronSchedule(cronExpression: string): string {
    // Parse cron expression: "minute hour day month weekday"
    const parts = cronExpression.split(' ');

    if (parts.length !== 5) {
      return cronExpression; // Return as-is if not a valid cron expression
    }

    const [minute, hour, day, month, weekday] = parts;

    // Format hour and minute
    const hourNum = hour === '*' ? '00' : hour.padStart(2, '0');
    const minuteNum = minute === '*' ? '00' : minute.padStart(2, '0');
    const time = `${hourNum}:${minuteNum}`;

    // Check if it's daily (day, month, weekday are all *)
    if (day === '*' && month === '*' && weekday === '*') {
      return `Hàng ngày lúc ${time}`;
    }

    // If specific day of month
    if (day !== '*' && month === '*' && weekday === '*') {
      return `Ngày ${day} hàng tháng lúc ${time}`;
    }

    // If specific day of week
    const daysOfWeek: Record<string, string> = {
      '0': 'Chủ nhật',
      '1': 'Thứ 2',
      '2': 'Thứ 3',
      '3': 'Thứ 4',
      '4': 'Thứ 5',
      '5': 'Thứ 6',
      '6': 'Thứ 7',
    };

    if (weekday !== '*' && day === '*' && month === '*') {
      const dayName = daysOfWeek[weekday] || `Ngày ${weekday}`;
      return `${dayName} hàng tuần lúc ${time}`;
    }

    // For other complex cases, return a simplified version
    return `Lúc ${time}`;
  }

  /**
   * Escape special characters for Telegram HTML
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Escape special characters for Telegram Markdown
   */
  private escapeMarkdown(text: string): string {
    // Escape special Markdown characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
    // eslint-disable-next-line no-useless-escape
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
  }

  /**
   * Send notification for cron job execution result
   */
  async sendCronJobNotification(data: NotificationData): Promise<void> {
    try {
      const { chatId, plate, executionResult, comparisonResult } = data;

      if (!executionResult.success) {
        await this.sendErrorNotification(chatId, plate, executionResult.error || 'Unknown error');
        return;
      }

      if (!comparisonResult.hasChanges) {
        await this.sendNoChangesNotification(chatId, plate);
        return;
      }

      if (comparisonResult.newViolations.length > 0) {
        await this.sendNewViolationsNotification(chatId, plate, comparisonResult.newViolations);
      }

      if (comparisonResult.removedViolations.length > 0) {
        await this.sendRemovedViolationsNotification(
          chatId,
          plate,
          comparisonResult.removedViolations,
        );
      }
    } catch (error) {
      console.error('❌ Error sending cron job notification:', error);
    }
  }

  /**
   * Send notification for new violations
   */
  private async sendNewViolationsNotification(
    chatId: number,
    plate: string,
    violations: Violation[],
  ): Promise<void> {
    const vehicleTypeNames = {
      '1': '🚗 Xe ô tô',
      '2': '🏍️ Xe máy',
      '3': '🚴‍♀️ Xe đạp điện',
    };

    const vehicleTypeName =
      vehicleTypeNames[plate as keyof typeof vehicleTypeNames] || 'Phương tiện';

    let message = `🚨 *CÓ VI PHẠM MỚI!*\n\n`;
    message += `📋 Biển số: *${plate}*\n`;
    message += `🚗 Loại xe: ${vehicleTypeName}\n`;
    message += `📅 Thời gian tra cứu: ${new Date().toLocaleString('vi-VN')}\n\n`;
    message += `🔍 *Tìm thấy ${violations.length} vi phạm mới:*\n\n`;

    // Send each violation
    for (let i = 0; i < violations.length; i++) {
      const violation = violations[i];

      message += `*${i + 1}. Vi phạm lúc ${violation.violationTime}*\n`;
      message += `📍 Địa điểm: ${violation.location}\n`;
      message += `❌ Loại vi phạm: ${violation.violation}\n`;
      message += `💰 Số tiền phạt: ${violation.fine || 'Chưa có thông tin'}\n`;
      message += `📌 Trạng thái: ${violation.status || 'Chưa xử lý'}\n`;

      if (violation.resolutionAddress) {
        message += `📮 Địa chỉ nộp phạt: ${violation.resolutionAddress}\n`;
      }

      if (violation.resolutionPhone) {
        message += `📞 Số điện thoại: ${violation.resolutionPhone}\n`;
      }

      message += `\n`;
    }

    message += `💡 *Lưu ý:* Bạn có thể tra cứu lại bất kỳ lúc nào bằng lệnh /lookup`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  /**
   * Send notification for removed violations
   */
  private async sendRemovedViolationsNotification(
    chatId: number,
    plate: string,
    violations: Violation[],
  ): Promise<void> {
    let message = `✅ *VI PHẠM ĐÃ ĐƯỢC XỬ LÝ!*\n\n`;
    message += `📋 Biển số: *${plate}*\n`;
    message += `📅 Thời gian tra cứu: ${new Date().toLocaleString('vi-VN')}\n\n`;
    message += `🎉 *${violations.length} vi phạm đã được xử lý:*\n\n`;

    for (let i = 0; i < violations.length; i++) {
      const violation = violations[i];

      message += `*${i + 1}. Vi phạm lúc ${violation.violationTime}*\n`;
      message += `📍 Địa điểm: ${violation.location}\n`;
      message += `❌ Loại vi phạm: ${violation.violation}\n`;
      message += `💰 Số tiền phạt: ${violation.fine || 'Chưa có thông tin'}\n\n`;
    }

    message += `💡 *Lưu ý:* Bạn có thể tra cứu lại bất kỳ lúc nào bằng lệnh /lookup`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  /**
   * Send notification when no changes detected
   */
  private async sendNoChangesNotification(chatId: number, plate: string): Promise<void> {
    const message =
      `✅ *KHÔNG CÓ VI PHẠM MỚI*\n\n` +
      `📋 Biển số: *${this.escapeMarkdown(plate)}*\n` +
      `📅 Thời gian tra cứu: ${new Date().toLocaleString('vi-VN')}\n\n` +
      `🎉 Không có vi phạm mới nào được phát hiện!\n\n` +
      `💡 *Lưu ý:* Bạn có thể tra cứu lại bất kỳ lúc nào bằng lệnh /lookup`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  /**
   * Send error notification
   */
  private async sendErrorNotification(chatId: number, plate: string, error: string): Promise<void> {
    let friendlyMessage = '';

    if (error.includes('404')) {
      friendlyMessage =
        `🔒 *Lỗi kết nối*\n\n` +
        `Không thể kết nối đến hệ thống tra cứu cho biển số *${plate}*.\n\n` +
        `💡 *Gợi ý:* Thử lại sau vài phút`;
    } else if (error.includes('403')) {
      friendlyMessage =
        `🚫 *Truy cập bị từ chối*\n\n` +
        `Hệ thống đã từ chối yêu cầu tra cứu cho biển số *${plate}*.\n\n` +
        `💡 *Gợi ý:* Chờ vài phút rồi thử lại`;
    } else if (error.includes('Timeout')) {
      friendlyMessage =
        `⏰ *Hết thời gian chờ*\n\n` +
        `Hệ thống phản hồi quá chậm cho biển số *${plate}*.\n\n` +
        `💡 *Gợi ý:* Kiểm tra kết nối mạng và thử lại`;
    } else {
      friendlyMessage =
        `❌ *Lỗi tra cứu tự động*\n\n` +
        `Đã xảy ra lỗi khi tra cứu biển số *${plate}*:\n` +
        `\`${error}\`\n\n` +
        `💡 *Gợi ý:* Thử lại sau vài phút hoặc sử dụng lệnh /lookup`;
    }

    await this.bot.sendMessage(chatId, friendlyMessage, { parse_mode: 'Markdown' });
  }

  /**
   * Send cron job setup confirmation
   */
  async sendCronJobSetupConfirmation(
    chatId: number,
    plate: string,
    vehicleType: string,
  ): Promise<void> {
    const vehicleTypeNames = {
      '1': '🚗 Xe ô tô',
      '2': '🏍️ Xe máy',
      '3': '🚴‍♀️ Xe đạp điện',
    };

    const vehicleTypeName =
      vehicleTypeNames[vehicleType as keyof typeof vehicleTypeNames] || 'Phương tiện';

    const scheduleDescription = this.formatCronSchedule(config.cron.schedule);

    const message =
      `✅ <b>CRON JOB ĐÃ ĐƯỢC THIẾT LẬP!</b>\n\n` +
      `📋 Biển số: <b>${this.escapeHtml(plate)}</b>\n` +
      `🚗 Loại xe: ${vehicleTypeName}\n` +
      `⏰ Lịch trình: ${scheduleDescription}\n\n` +
      `🎉 Từ bây giờ, bot sẽ tự động tra cứu vi phạm cho phương tiện này mỗi ngày và gửi thông báo nếu có thay đổi.\n\n` +
      `💡 <b>Các lệnh quản lý:</b>\n` +
      `• /cron_status - Xem trạng thái cron job\n` +
      `• /cron_update - Cập nhật phương tiện\n` +
      `• /cron_disable - Tắt cron job`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  /**
   * Send cron job status
   */
  async sendCronJobStatus(
    chatId: number,
    hasCronJob: boolean,
    cronJob?: {
      plate: string;
      vehicleType: string;
      lastRun?: string;
      nextRun?: string;
    },
    isActive?: boolean,
  ): Promise<void> {
    if (!hasCronJob || !cronJob) {
      const message =
        `📋 <b>TRẠNG THÁI CRON JOB</b>\n\n` +
        `❌ Bạn chưa thiết lập cron job nào.\n\n` +
        `💡 <b>Để thiết lập cron job:</b>\n` +
        `• Gõ /cron_setup để bắt đầu\n` +
        `• Hoặc sử dụng menu chính`;

      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
      return;
    }

    const vehicleTypeNames = {
      '1': '🚗 Xe ô tô',
      '2': '🏍️ Xe máy',
      '3': '🚴‍♀️ Xe đạp điện',
    };

    const vehicleTypeName =
      vehicleTypeNames[cronJob.vehicleType as keyof typeof vehicleTypeNames] || 'Phương tiện';
    const status = isActive ? '✅ Đang hoạt động' : '❌ Đã tắt';
    const lastRun = cronJob.lastRun
      ? new Date(cronJob.lastRun).toLocaleString('vi-VN')
      : 'Chưa chạy';
    const nextRun = cronJob.nextRun
      ? new Date(cronJob.nextRun).toLocaleString('vi-VN')
      : 'Chưa xác định';

    const scheduleDescription = this.formatCronSchedule(config.cron.schedule);

    const message =
      `📋 <b>TRẠNG THÁI CRON JOB</b>\n\n` +
      `📋 Biển số: <b>${this.escapeHtml(cronJob.plate)}</b>\n` +
      `🚗 Loại xe: ${vehicleTypeName}\n` +
      `⏰ Lịch trình: ${scheduleDescription}\n` +
      `📊 Trạng thái: ${status}\n` +
      `🕐 Lần chạy cuối: ${lastRun}\n` +
      `⏰ Lần chạy tiếp theo: ${nextRun}\n\n` +
      `💡 <b>Các lệnh quản lý:</b>\n` +
      `• /cron_update - Cập nhật phương tiện\n` +
      `• /cron_disable - Tắt cron job\n` +
      `• /cron_setup - Thiết lập lại`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }

  /**
   * Send cron job disabled confirmation
   */
  async sendCronJobDisabledConfirmation(chatId: number, plate: string): Promise<void> {
    const message =
      `✅ <b>CRON JOB ĐÃ ĐƯỢC TẮT</b>\n\n` +
      `📋 Biển số: <b>${this.escapeHtml(plate)}</b>\n\n` +
      `🎉 Cron job đã được tắt thành công. Bot sẽ không tự động tra cứu vi phạm cho phương tiện này nữa.\n\n` +
      `💡 <b>Để bật lại:</b>\n` +
      `• Gõ /cron_setup để thiết lập lại\n` +
      `• Hoặc sử dụng menu chính`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }
}
