using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Synapse.UI.Modules.ModuleA.Services;
using Synapse.Common;

namespace Synapse.UI.Modules.ModuleA.Controllers
{
    public class ModuleAController : Controller
    {
        private ITestService _testService;
        private readonly string _apiBaseUrl;
        private readonly Synapse.Services.ControllerServiceHttpApiClient _svc;

        public ModuleAController(ITestService testService)
        {
            _testService = testService;
            _apiBaseUrl = "http://localhost:20000/synapse/execute/";
            _svc = new Synapse.Services.ControllerServiceHttpApiClient(_apiBaseUrl);

        }
        public IActionResult Index()
        {
            
            string _b = ModuleAClass.teststring();
            ViewData["Title"] = "Test DI into controller: " + _testService.Test();
            return View();
        }
        //public IActionResult Index()
        //{
        //    return View();
        //}

        public async Task<string> StartPlan(string planName)
        {
            long _instanceId = 0;
            try
            {
                _instanceId = await _svc.StartPlanAsync(planName);
            }
            catch
            {

            }
            return _instanceId.ToString();
        }
    }
}
