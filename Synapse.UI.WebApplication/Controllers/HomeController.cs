using Microsoft.AspNetCore.Mvc;
using System.Reflection;

namespace ModularUI.Modules.WebApplication
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }        
    }
}
