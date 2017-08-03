using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using SynapseUI.ViewModels;
using SynapseUI.Helpers;
using Synapse.Core;
using Synapse.Services;
using Kendo.Mvc.UI;
using Kendo.Mvc.Extensions;
using NLog;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using AutoMapper;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Linq;

namespace SynapseUI.Controllers
{
    public class HomeController : Controller
    {
        IConfiguration _iconfiguration;
        private readonly string _apiBaseUrl;
        private readonly ILogger<HomeController> _logger;
        private readonly IMapper _mapper;
        private Synapse.Services.ControllerServiceHttpApiClient _svc;        

        public HomeController(IConfiguration iconfiguration, ILogger<HomeController> logger, IMapper mapper)
        {
            _iconfiguration = iconfiguration;
            _logger = logger;
            _mapper = mapper;
            _apiBaseUrl = _iconfiguration["SynapseControllerAPIURL"];
            _svc = new Synapse.Services.ControllerServiceHttpApiClient(_apiBaseUrl);
        }        

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult About()
        {
            ViewData["Message"] = "Your application description page.";

            return View();
        }

        public IActionResult Contact()
        {
            ViewData["Message"] = "Your contact page.";

            return View();
        }

        public IActionResult Error()
        {
            return View();
        }
        [HttpGet]
        public async Task<ActionResult> GetPlanList(string filterString, bool isRegexFilter)
        {            
            string _controller = this.RouteData.Values["controller"].ToString();
            string _action = this.RouteData.Values["action"].ToString();
            
            //string _logMessage = $"{_controller}.{_action}({nameof(filterString)}:{filterString},{nameof(isRegexFilter)}:{isRegexFilter}) from {HttpContext.Request.UserHostName}:{HttpContext.Request.UserHostAddress}.";
            string _logMessage = $"{_controller}.{_action}({nameof(filterString)}:{filterString},{nameof(isRegexFilter)}:{isRegexFilter}) from {this.HttpContext.Connection.RemoteIpAddress}.";
            _logger.LogInformation(_logMessage);

            List<string> _planList = null;
            try
            {
                _planList = await _svc.GetPlanListAsync(filterString, isRegexFilter);
                if (_planList.Count == 0)
                {
                    _logger.LogInformation($"{_controller}.{_action} No plans found.");
                }
            }
            catch (Exception ex)
            {
                _logMessage = $"{_controller}.{_action} Exception encountered";
                _logger.LogError(1000, ex, _logMessage);
            }
            if (_planList == null) _planList = new List<string>();
            return Json(_planList);
        }
        [HttpPost]
        public async Task<ActionResult> GetPlanHistoryList([DataSourceRequest] DataSourceRequest request, string planUniqueName)
        {
            string _controller = this.RouteData.Values["controller"].ToString();
            string _action = this.RouteData.Values["action"].ToString();

            // executing controller.action with arguments 
            //-string _logMessage = $"{_controller}.{_action}({nameof(planUniqueName)}:{planUniqueName}) from {HttpContext.Request.UserHostName}:{HttpContext.Request.UserHostAddress}.";
            string _logMessage = $"{_controller}.{_action}({nameof(planUniqueName)}:{planUniqueName}) from {this.HttpContext.Connection.RemoteIpAddress}.";
            _logger.LogInformation(_logMessage);            

            List<long> _planInstanceIdList = null;
            List<PlanHistoryVM> _planHistoryList = null;
            try
            {
                _planInstanceIdList = await _svc.GetPlanInstanceIdListAsync(planUniqueName);
                if (_planInstanceIdList.Count == 0)
                {
                    _logMessage = $"{_controller}.{_action} No plan history found for {planUniqueName}.";
                    _logger.LogInformation(_logMessage);
                }

                List<Task<Plan>> _tasks = new List<Task<Plan>>();
                foreach (long _planInstanceId in _planInstanceIdList)
                {
                    _tasks.Add(_svc.GetPlanStatusAsync(planUniqueName, _planInstanceId));
                }
                Plan[] _planStatusList = await Task.WhenAll(_tasks);
                _planHistoryList = _planStatusList.Select(x => new PlanHistoryVM() { PlanInstanceId = x.InstanceId.ToString(), RequestNumber = x.StartInfo.RequestNumber, RequestUser = x.StartInfo.RequestUser, Status = x.Result.Status, LastModified = x.LastModified }).OrderByDescending(x => x.PlanInstanceId).ToList();
            }
            catch (Exception ex)
            {
                _logMessage = $"{_controller}.{_action} Exception encountered";
                _logger.LogError(1000, ex, _logMessage);
            }
            if (_planHistoryList == null)
                //-return new JsonNetResult(new List<PlanHistoryVM>());
                return Json(new List<PlanHistoryVM>());
            else
                //-return new JsonNetResult(_planHistoryList.ToDataSourceResult(request));
                return Json(_planHistoryList.ToDataSourceResult(request));

        }
        //[HttpGet]
        //public async Task<ActionResult> GetPlanActions(string planUniqueName)
        //{
        //    string _controller = this.RouteData.Values["controller"].ToString();
        //    string _action = this.RouteData.Values["action"].ToString();
        //    string _logMessage = $"{_controller}.{_action}({nameof(planUniqueName)}:{planUniqueName}) from {this.HttpContext.Connection.RemoteIpAddress}.";
        //    _logger.LogInformation(_logMessage);

        //    List<Plan> _plans = new List<Plan>();
        //    Plan _plan = null;
        //    try
        //    {
        //        _plan = await _svc.GetPlanAsync(planUniqueName);
        //    }
        //    catch (Exception ex)
        //    {
        //        _logMessage = $"{_controller}.{_action} Exception encountered";
        //        _logger.LogError(1000, ex, _logMessage);
        //    }
        //    if (_plan != null) _plans.Add(_plan);

        //    return Json(_plans);
        //}
        [HttpGet]        
        public async Task<ActionResult> GetDynamicParameters([DataSourceRequest] DataSourceRequest request, string planUniqueName)
        {
            string _controller = this.RouteData.Values["controller"].ToString();
            string _action = this.RouteData.Values["action"].ToString();
            string _logMessage = $"{_controller}.{_action}({nameof(planUniqueName)}:{planUniqueName}) from {this.HttpContext.Connection.RemoteIpAddress}.";
            _logger.LogInformation(_logMessage);

            List<DynamicParametersVM> _parms = null;
            Plan _plan = null;
            try
            {
                _plan = await _svc.GetPlanAsync(planUniqueName);
                if (_plan == null)
                {
                    _logMessage = $"{_controller}.{_action} Can't get plan {planUniqueName}.";
                    _logger.LogError(_logMessage);
                }
                else
                {
                    _parms = new List<DynamicParametersVM>();
                    BuildDynamicParametersRecursive(_plan.Actions, ref _parms);
                }
            }
            catch (Exception ex)
            {
                _logMessage = $"{_controller}.{_action} Exception encountered";
                _logger.LogError(1000, ex, _logMessage);
            }
            if (_parms == null) _parms.Add(new DynamicParametersVM());

            return Json(await _parms.ToTreeDataSourceResultAsync(request, e => e.ActionId,
                e => e.ParentActionId,
                e => e));
        }
        private static void BuildDynamicParametersRecursive(List<ActionItem> actions, ref List<DynamicParametersVM> parms)
        {
            int _id = 0;
            BuildDynamicParametersRecursive(actions, null, ref _id, ref parms);
        }
        private static void BuildDynamicParametersRecursive(List<ActionItem> actions, int? parentId, ref int id, ref List<DynamicParametersVM> parms)
        {
            int subParentId = 0;
            int paramsParentId = 0;
            foreach (ActionItem _ai in actions)
            {
                parms.Add(new DynamicParametersVM() { ActionName = _ai.Name, ActionId = ++id, ParentActionId = parentId });
                subParentId = id;
                // config parameters
                if (_ai.Handler != null && _ai.Handler.HasConfig && _ai.Handler.Config.HasDynamic)
                {
                    parms.Add(new DynamicParametersVM() { ActionName = "Config", ActionId = ++id, ParentActionId = subParentId });
                    paramsParentId = id;
                    foreach (dynamic _dv in _ai.Handler.Config.Dynamic)
                    {
                        parms.Add(new DynamicParametersVM() { ActionName = "", ActionId = ++id, ParentActionId = paramsParentId, DynamicParameterName = _dv.Name });
                    }
                }
                // action parameters
                if (_ai.HasParameters && _ai.Parameters.HasDynamic)
                {
                    parms.Add(new DynamicParametersVM() { ActionName = "Parameters", ActionId = ++id, ParentActionId = subParentId });
                    paramsParentId = id;
                    foreach (DynamicValue _dv in _ai.Parameters.Dynamic)
                    {
                        parms.Add(new DynamicParametersVM() { ActionName = "", ActionId = ++id, ParentActionId = paramsParentId, DynamicParameterName = _dv.Name });
                    }
                }
                if (_ai.HasActionGroup) BuildDynamicParametersRecursive(_ai.ActionGroup, subParentId, ref id, ref parms);
                if (_ai.HasActions) BuildDynamicParametersRecursive(_ai.Actions, subParentId, ref id, ref parms);

            }
        }
        private static void BuildDynamicParametersRecursive(ActionItem actionGroup, int? parentId, ref int id, ref List<DynamicParametersVM> parms)
        {
            int subParentId = 0;
            parms.Add(new DynamicParametersVM() { ActionName = actionGroup.Name, ActionGroup = "Y", ActionId = ++id, ParentActionId = parentId });
            subParentId = id;
            if (actionGroup.HasParameters && actionGroup.Parameters.HasDynamic)
            {
                foreach (DynamicValue _dv in actionGroup.Parameters.Dynamic)
                {
                    parms.Add(new DynamicParametersVM() { ActionName = "", ActionId = ++id, ParentActionId = subParentId, DynamicParameterName = _dv.Name });
                }
            }
            if (actionGroup.HasActions) BuildDynamicParametersRecursive(actionGroup.Actions, subParentId, ref id, ref parms);

        }
        //[HttpGet]
        public async Task<ActionResult> GetPlanStatus(string planUniqueName, long? planInstanceId = null)
        {
            string _controller = this.RouteData.Values["controller"].ToString();
            string _action = this.RouteData.Values["action"].ToString();
            string _logMessage = $"{_controller}.{_action}({nameof(planUniqueName)}:{planUniqueName},{nameof(planInstanceId)}:{planInstanceId}) from {this.HttpContext.Connection.RemoteIpAddress}.";
            _logger.LogInformation(_logMessage);

            Plan _plan = null;
            try
            {
                if (planInstanceId == null)
                    _plan = await _svc.GetPlanAsync(planUniqueName);
                else
                    _plan = await _svc.GetPlanStatusAsync(planUniqueName, planInstanceId.GetValueOrDefault());
            }
            catch (Exception ex)
            {
                _logMessage = $"{_controller}.{_action} Exception encountered";
                _logger.LogError(1000, ex, _logMessage);
            }
            if (_plan == null) //_plan = new Plan();
                return new EmptyResult();
            else
            {
                //return new JsonNetResult(_plan);                
                //return Json(_plan, new JsonSerializerSettings { Converters = new[] { new StringEnumConverter() } });
                JsonSerializerSettings _serializerSettings = new JsonSerializerSettings();
                _serializerSettings.Converters.Add(new StringEnumConverter());
                _serializerSettings.Converters.Add(new LongStringConverter());  // used to convert instanceID to string so they can be read in full by javascript
                return Json(_plan, _serializerSettings);               
            }
            
        }
        [HttpGet]
        public async Task<ActionResult> GetPlanStatusForDiagram(string planUniqueName, long? planInstanceId = null)
        {
            string _controller = this.RouteData.Values["controller"].ToString();
            string _action = this.RouteData.Values["action"].ToString();
            string _logMessage = $"{_controller}.{_action}({nameof(planUniqueName)}:{planUniqueName},{nameof(planInstanceId)}:{planInstanceId}) from {this.HttpContext.Connection.RemoteIpAddress}.";
            _logger.LogInformation(_logMessage);

            Plan _plan = null;
            PlanStatusVM _status = null;
            try
            {
                if (planInstanceId == null)
                    _plan = await _svc.GetPlanAsync(planUniqueName);
                else
                    _plan = await _svc.GetPlanStatusAsync(planUniqueName, planInstanceId.GetValueOrDefault());
                _status = _mapper.Map<Plan, PlanStatusVM>(_plan);

                List<PlanStatusVM> _actions = null;
                _actions = MoveActionGroupToActionsRecursive(_status.Actions);
                _status.Actions = _actions;             
            }
            catch (Exception ex)
            {
                _logMessage = $"{_controller}.{_action} Exception encountered";
                _logger.LogError(1000, ex, _logMessage);
            }
            if (_status == null) //_plan = new Plan();
                return new EmptyResult();
            else
                return Json(_status);
        }
        public List<PlanStatusVM> MoveActionGroupToActionsRecursive(List<PlanStatusVM> actions)
        {
            foreach (PlanStatusVM _item in actions)
            {
                if (_item.ActionGroup != null)
                {
                    if (_item.Actions != null) _item.Actions.Insert(0, _item.ActionGroup);
                    else (_item.Actions) = new List<PlanStatusVM> { _item.ActionGroup };
                    _item.Actions[0].IsActionGroup = true;
                    _item.ActionGroup = null;
                }
                if (_item.Actions != null && _item.Actions.Count > 0 )
                {
                    _item.Actions = MoveActionGroupToActionsRecursive(_item.Actions);
                }
            }
            return actions;
        }        
        [HttpPost]
        public async Task<string> StartPlan([FromBody] Newtonsoft.Json.Linq.JObject requestLoad)
        {
            string _controller = this.RouteData.Values["controller"].ToString();
            string _action = this.RouteData.Values["action"].ToString();
            string _logMessage = $"{_controller}.{_action}({nameof(requestLoad)}:{requestLoad.ToString()}) from {this.HttpContext.Connection.RemoteIpAddress}.";
            _logger.LogInformation(_logMessage);

            StartPlanParamsVM _startPlanParams = JsonConvert.DeserializeObject<StartPlanParamsVM>(Convert.ToString(requestLoad));
            long _instanceId = 0;
            try
            {
                _instanceId = await _svc.StartPlanAsync(planName: _startPlanParams.PlanUniqueName, requestNumber: _startPlanParams.RequestNumber, dynamicParameters: _startPlanParams.DynamicParameters);
            }
            catch (Exception ex)
            {
                _logMessage = $"{_controller}.{_action} Exception encountered";
                _logger.LogError(1000, ex, _logMessage);
            }
            return _instanceId.ToString();
            //return Json(new {InstanceId= _instanceId });
        }
        [HttpPost]
        public async Task CancelPlan(string planUniqueName, long planInstanceId)
        {
            string _controller = this.RouteData.Values["controller"].ToString();
            string _action = this.RouteData.Values["action"].ToString();
            string _logMessage = $"{_controller}.{_action}({nameof(planUniqueName)}:{planUniqueName},{nameof(planInstanceId)}:{planInstanceId}) from {this.HttpContext.Connection.RemoteIpAddress}.";
            _logger.LogInformation(_logMessage);

            try
            {
                await _svc.CancelPlanAsync(planUniqueName, planInstanceId);
            }
            catch (Exception ex)
            {
                _logMessage = $"{_controller}.{_action} Exception encountered";
                _logger.LogError(1000,ex, _logMessage);
            }
        }
    }
}
