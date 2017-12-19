using System.Collections.Generic;

namespace Synapse.UI.WebApplication
{
    public class ModulesSettings
    {
        public string RootPath { get; set; }
        public List<IncludeSettings> Include { get; set; }
    }
    public class IncludeSettings
    {
        public string FolderName { get; set; }
        public string FriendlyName { get; set; }
        public string Url { get; set; }
    }
}
