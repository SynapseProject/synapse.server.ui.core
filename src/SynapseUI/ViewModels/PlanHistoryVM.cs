using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Synapse.Core;

namespace SynapseUI.ViewModels
{
    public class PlanHistoryVM
    {
        public string PlanInstanceId { get; set; }
        public string RequestUser { get; set; }
        public string RequestNumber { get; set; }
        public StatusType Status { get; set; }
        public string LastModified { get; set; }
    }
}