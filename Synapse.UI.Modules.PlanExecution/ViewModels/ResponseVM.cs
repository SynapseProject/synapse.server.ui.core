using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Synapse.UI.Modules.PlanExecution.ViewModels
{
    public class ResponseVM
    {
        public string Status { get; set; }
        public string Message { get; set; }
        public Dictionary<string, string[]> ValidationErrors { get; set; }
        public object Data { get; set; }
    }
}
