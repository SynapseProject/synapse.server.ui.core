using System.Collections.Generic;
using Synapse.Core;

namespace ModularUI.Modules.PlanExecution.ViewModels
{
    public class DynamicParametersVM
    {
        public int ActionId { get; set; }
        public string ActionName { get; set; }
        public string ActionGroup { get; set; }
        public StatusType ExecuteCase { get; set; }
        public string ParameterName { get; set; }
        public string ParameterValue { get; set; }
        public List<Option> ParameterValueOptions { get; set; }
        public int? ParentActionId { get; set; }
    }

}
