using Newtonsoft.Json;
using System.Collections.Generic;

namespace SynapseUI.ViewModels
{
    public class StartPlanParamsVM
    {
        public string PlanUniqueName { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public string RequestNumber { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        //public List<Dictionary<string, string>> DynamicParameters { get; set; } 
        public Dictionary<string,string> DynamicParameters { get; set; }
    }
}
