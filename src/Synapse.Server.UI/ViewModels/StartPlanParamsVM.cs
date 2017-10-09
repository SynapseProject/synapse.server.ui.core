using Newtonsoft.Json;
using System.Collections.Generic;

namespace Synapse.Server.UI.ViewModels
{
    public class StartPlanParamsVM
    {
        public string PlanUniqueName { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public string RequestNumber { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]        
        public Dictionary<string,string> DynamicParameters { get; set; }
    }
}
