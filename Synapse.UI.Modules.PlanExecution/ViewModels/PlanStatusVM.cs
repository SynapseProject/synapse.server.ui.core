using System.Collections.Generic;
using Synapse.Core;
using Synapse.UI.Modules.PlanExecution.Helpers;

namespace Synapse.UI.Modules.PlanExecution.ViewModels
{
    public class PlanStatusVM
    {
        public string Name { get; set; }
        public StatusType Status { get; set; }
        public string StatusText { get; set; }
        public string StatusColor => StatusHelper.GetColor(Status);
        public bool IsActionGroup { get; set; }
        public PlanStatusVM ActionGroup { get; set; }
        public List<PlanStatusVM> Actions { get; set; }


    }
}