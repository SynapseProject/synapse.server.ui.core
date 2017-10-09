using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Synapse.Core;

namespace Synapse.Server.UI.ViewModels
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
