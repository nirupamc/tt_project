import { autoSubmitTimesheet } from "./functions/autoSubmitTimesheet";
import { fridayWeeklySummary } from "./functions/fridayWeeklySummary";
import { dailyZoomMeeting } from "./functions/dailyZoomMeeting";
import { autoApprovePastWeeks } from "./functions/autoApprovePastWeeks";
import { autoCompleteProjectDays } from "./functions/autoCompleteProjectDays";

export const functions = [
  autoSubmitTimesheet,
  fridayWeeklySummary,
  dailyZoomMeeting,
  autoApprovePastWeeks,
  autoCompleteProjectDays,
];

export default functions;