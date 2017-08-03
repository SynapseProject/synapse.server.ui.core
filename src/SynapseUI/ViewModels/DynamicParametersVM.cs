using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Synapse.Core;

namespace SynapseUI.ViewModels
{
    public class DynamicParametersVM
    {
        public int ActionId { get; set; }
        public string ActionName { get; set; }
        public string ActionGroup { get; set; }             
        public StatusType ExecuteCase { get; set; }         
        public string DynamicParameterName { get; set; }    
        public string DynamicParameterValue { get; set; }   
        public int? ParentActionId { get; set; }            
    }

}
