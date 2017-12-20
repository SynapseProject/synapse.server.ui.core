using Microsoft.AspNetCore.Mvc;

namespace Synapse.UI.WebApplication.Controllers
{
    public class ErrorController : Controller
    {
        [Route("/Error/{code:int}")]
        public IActionResult Index(int code)
        {
            ViewData["StatusCode"] = code;
            return View();
        }
    }
}