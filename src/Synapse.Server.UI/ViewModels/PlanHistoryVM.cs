using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Synapse.Core;
using Synapse.Server.UI.Helpers;

namespace Synapse.Server.UI.ViewModels
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