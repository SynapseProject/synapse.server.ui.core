using Synapse.Core;
using ModularUI.Modules.PlanExecution.Helpers;

namespace ModularUI.Modules.PlanExecution.ViewModels
{
    public class PlanHistoryVM
    {
        public string PlanInstanceId { get; set; }
        public string RequestUser { get; set; }
        public string RequestNumber { get; set; }
        public StatusType Status { get; set; }
        public string LastModified { get; set; }
        public string StatusColor => StatusHelper.GetColor(Status);
    }
}