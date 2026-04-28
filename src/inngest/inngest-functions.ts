import { autoSubmitTimesheet } from "./functions/autoSubmitTimesheet";
import { fridayWeeklySummary } from "./functions/fridayWeeklySummary";
import { dailyZoomMeeting } from "./functions/dailyZoomMeeting";
import { autoApprovePastWeeks } from "./functions/autoApprovePastWeeks";

export const functions = [autoSubmitTimesheet, fridayWeeklySummary, dailyZoomMeeting, autoApprovePastWeeks];

export default functions;