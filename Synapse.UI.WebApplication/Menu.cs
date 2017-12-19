using System.Collections.Generic;

namespace Synapse.UI.WebApplication
{
    public static class Menu
    {
        private static IEnumerable<MenuItem> items;
        public static IEnumerable<MenuItem> Items
        {
            get
            {
                return Menu.items;
            }
        }
        public static void SetItems(IEnumerable<MenuItem> items)
        {
            Menu.items = items;
        }
    }
    public class MenuItem
    {
        public string Name { get; set; }
        public string Url { get; set; }
    }
}

