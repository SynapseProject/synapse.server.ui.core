using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace SynapseUI.ViewModels
{
    public class PlanStatusVM
    {
        public string Name { get; set; }        
        public string Status { get; set; }
        public string StatusColor { get; set; }
        public bool IsActionGroup { get; set; }
        public PlanStatusVM ActionGroup { get; set; }
        public List<PlanStatusVM> Actions { get; set; }
    }
}