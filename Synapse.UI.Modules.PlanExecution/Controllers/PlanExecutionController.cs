using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Synapse.UI.Modules.PlanExecution.ViewModels;
using Synapse.UI.Modules.PlanExecution.Helpers;
using Synapse.Core;
using Kendo.Mvc.UI;
using Kendo.Mvc.Extensions;
using Microsoft.Extensions.Logging;
using AutoMapper;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;


namespace Synapse.UI.Modules.PlanExecution.Controllers
{
    public class PlanExecution : Controller
    {
        IConfiguration _configuration;
        private readonly string _apiBaseUrl;
        private readonly ILogger<PlanExecution> _logger;
        private readonly IMapper _mapper;
        private Synapse.Services.ControllerServiceHttpApiClient _svc;

        public PlanExecution(IConfiguration configuration, ILogger<PlanExecution> logger, IMapper mapper)
        {
            _configuration = configuration;
            _logger = logger;
            _mapper = mapper;
            _apiBaseUrl = _configuration["SynapseControllerAPIURL"];
            _svc = new Synapse.Services.ControllerServiceHttpApiClient(_apiBaseUrl);
        }

        public IActionResult Index()
        {
            _logger.LogInformation("index");
            return View();
            //return Unauthorized(); // return BadRequest(); // used to test error handling by UseStatusCodePagesWithReExecute()
        }
        [HttpGet]
        public async Task<ActionResult> GetPlanList(string filterString, bool isRegexFilter)
        {
            _logger.LogInformation($"Arguments:({nameof(filterString)}:{filterString},{nameof(isRegexFilter)}:{isRegexFilter}).");

            List<string> _planList = null;
            try
            {
                _planList = await _svc.GetPlanListAsync(filterString, isRegexFilter);
                if (_planList.Count == 0)
                {
                    _logger.LogInformation("No plans found.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception encountered.");
            }
            if (_planList == null)
            {
                // for documentation purposes
                // option 1: return empty list

                // option 2: throw exception. this will send status code 500 (internal server error) response.
                //           command: throw new Exception("test");
                //           To catch the error add an error event handler to the datasource. 
                //           Cons: always returns status code 500 (internal server error). hard to retrieve the custom error message
                //
                // option 3: return error as datasourceresult. sends the error message with status code 200 (ok)
                //           command: return Json(new DataSourceResult
                //                    {
                //                          Errors = "my custom error msg"
                //                    });
                //           To catch the error add an error event handler to the datasource. 
                //           onError(e)
                //              e.status = "customerror"
                //              e.errors = "my custom error msg"
                //           pros: you can have your own custom error

                _planList = new List<string>();
            }
            return Json(_planList);
        }
        [HttpPost]
        public async Task<ActionResult> GetPlanHistoryList([DataSourceRequest] DataSourceRequest request, string planUniqueName, int showNRecs)
        {
            _logger.LogInformation($"Arguments:({nameof(planUniqueName)}:{planUniqueName},{nameof(showNRecs)}:{showNRecs}),{nameof(request)}:{request.ToString()}.");

            List<long> _planInstanceIdList = null;
            List<PlanHistoryVM> _planHistoryList = null;
            try
            {
                _planInstanceIdList = await _svc.GetPlanInstanceIdListAsync(planUniqueName);
                if (_planInstanceIdList.Count == 0)
                {
                    _logger.LogInformation($"No plan history found for {planUniqueName}.");
                }
                // to add: limit no of records returned
                if (showNRecs != 0) _planInstanceIdList = _planInstanceIdList.OrderByDescending(i => i).Take(showNRecs).ToList();


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
                _logger.LogError(ex, "Exception encountered.");
            }
            if (_planHistoryList == null)
                return Json(new List<PlanHistoryVM>());
            else
                return Json(_planHistoryList.ToDataSourceResult(request));

        }
        [HttpGet]
        public async Task<ActionResult> GetDynamicParameters([DataSourceRequest] DataSourceRequest request, string planUniqueName)
        {
            _logger.LogInformation($"Arguments:({nameof(planUniqueName)}:{planUniqueName},{nameof(request)}:{request.ToString()}).");

            List<DynamicParametersVM> _parms = null;
            Plan _plan = null;
            try
            {
                _plan = await _svc.GetPlanAsync(planUniqueName);
                if (_plan == null)
                {
                    _logger.LogError($"Can't get plan {planUniqueName}.");
                }
                else
                {
                    _parms = new List<DynamicParametersVM>();
                    BuildDynamicParametersRecursive(_plan.Actions, ref _parms);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception encountered.");
            }
            if (_parms == null) _parms = new List<DynamicParametersVM>();

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
                    foreach (DynamicValue _dv in _ai.Handler.Config.Dynamic)
                    {
                        parms.Add(new DynamicParametersVM() { ActionName = "", ActionId = ++id, ParentActionId = paramsParentId, ParameterName = _dv.Name, ParameterValueOptions = _dv.Options });
                    }
                }
                // action parameters
                if (_ai.HasParameters && _ai.Parameters.HasDynamic)
                {
                    parms.Add(new DynamicParametersVM() { ActionName = "Parameters", ActionId = ++id, ParentActionId = subParentId });
                    paramsParentId = id;
                    foreach (DynamicValue _dv in _ai.Parameters.Dynamic)
                    {
                        parms.Add(new DynamicParametersVM() { ActionName = "", ActionId = ++id, ParentActionId = paramsParentId, ParameterName = _dv.Name, ParameterValueOptions = _dv.Options });
                    }
                }
                if (_ai.HasActionGroup) BuildDynamicParametersRecursive(_ai.ActionGroup, subParentId, ref id, ref parms);
                if (_ai.HasActions) BuildDynamicParametersRecursive(_ai.Actions, subParentId, ref id, ref parms);

            }
        }
        private static void BuildDynamicParametersRecursive(ActionItem actionGroup, int? parentId, ref int id, ref List<DynamicParametersVM> parms)
        {
            int subParentId = 0;
            int paramsParentId = 0;
            parms.Add(new DynamicParametersVM() { ActionName = actionGroup.Name, ActionGroup = "Y", ActionId = ++id, ParentActionId = parentId });
            subParentId = id;        
            // config parameters
            if (actionGroup.Handler != null && actionGroup.Handler.HasConfig && actionGroup.Handler.Config.HasDynamic)
            {
                parms.Add(new DynamicParametersVM() { ActionName = "Config", ActionId = ++id, ParentActionId = subParentId });
                paramsParentId = id;
                foreach (DynamicValue _dv in actionGroup.Handler.Config.Dynamic)
                {
                    parms.Add(new DynamicParametersVM() { ActionName = "", ActionId = ++id, ParentActionId = paramsParentId, ParameterName = _dv.Name, ParameterValueOptions = _dv.Options });
                }
            }
            // action parameters
            if (actionGroup.HasParameters && actionGroup.Parameters.HasDynamic)
            {
                parms.Add(new DynamicParametersVM() { ActionName = "Parameters", ActionId = ++id, ParentActionId = subParentId });
                paramsParentId = id;
                foreach (DynamicValue _dv in actionGroup.Parameters.Dynamic)
                {
                    parms.Add(new DynamicParametersVM() { ActionName = "", ActionId = ++id, ParentActionId = paramsParentId, ParameterName = _dv.Name, ParameterValueOptions = _dv.Options });
                }
            }
            if (actionGroup.HasActions) BuildDynamicParametersRecursive(actionGroup.Actions, subParentId, ref id, ref parms);

        }
        //[HttpGet]
        //public async Task<ActionResult> GetPlanStatus(string planUniqueName, long? planInstanceId = null)
        public async Task<ActionResult> GetPlanStatus(string planUniqueName, long planInstanceId)
        {
            _logger.LogInformation($"Argumnets:({nameof(planUniqueName)}:{planUniqueName},{nameof(planInstanceId)}:{planInstanceId}).");

            Plan _plan = null;
            try
            {
                //if (planInstanceId == null)
                //    _plan = await _svc.GetPlanAsync(planUniqueName);
                //else
                    _plan = await _svc.GetPlanStatusAsync(planUniqueName, planInstanceId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception encountered.");
            }
            //if (_plan == null) _plan = new Plan();
            if (_plan == null) 
                return Json(new EmptyResult());
            else
            {
                JsonSerializerSettings _serializerSettings = new JsonSerializerSettings();
                _serializerSettings.Converters.Add(new StringEnumConverter());
                _serializerSettings.Converters.Add(new LongStringConverter());  // used to convert instanceID to string so they can be read in full by javascript
                return Json(_plan, _serializerSettings);
            }

        }
        [HttpGet]
        public async Task<ActionResult> GetPlanForDiagram(string planUniqueName)
        {
            _logger.LogInformation($"Arguments:({nameof(planUniqueName)}:{planUniqueName}).");

            Plan _plan = null;
            PlanStatusVM _status = null;
            try
            {
                _plan = await _svc.GetPlanAsync(planUniqueName);
                _status = _mapper.Map<Plan, PlanStatusVM>(_plan);

                List<PlanStatusVM> _actions = null;
                _actions = MoveActionGroupToActionsRecursive(_status.Actions);
                _status.Actions = _actions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception encountered.");
            }
            if (_status == null) //_plan = new Plan();
                return new EmptyResult();
            else
                return Json(_status);
        }
        [HttpGet]
        public async Task<ActionResult> GetResultPlanForDiagram(string planUniqueName, long planInstanceId)
        {
            _logger.LogInformation($"Arguments:({nameof(planUniqueName)}:{planUniqueName},{nameof(planInstanceId)}:{planInstanceId}).");

            Plan _plan = null;
            PlanStatusVM _status = null;
            try
            {
                _plan = await _svc.GetPlanStatusAsync(planUniqueName, planInstanceId);
                _status = _mapper.Map<Plan, PlanStatusVM>(_plan);

                List<PlanStatusVM> _actions = null;
                _actions = MoveActionGroupToActionsRecursive(_status.Actions);
                _status.Actions = _actions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception encountered.");
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
                if (_item.Actions != null && _item.Actions.Count > 0)
                {
                    _item.Actions = MoveActionGroupToActionsRecursive(_item.Actions);
                }
            }
            return actions;
        }
        [HttpPost]
        public async Task<string> StartPlan([FromBody] Newtonsoft.Json.Linq.JObject requestLoad)
        {
            _logger.LogInformation($"Arguments:({nameof(requestLoad)}:{requestLoad.ToString()}).");

            StartPlanParamsVM _startPlanParams = JsonConvert.DeserializeObject<StartPlanParamsVM>(Convert.ToString(requestLoad));
            long _instanceId = 0;
            try
            {
                _instanceId = await _svc.StartPlanAsync(planName: _startPlanParams.PlanUniqueName, requestNumber: _startPlanParams.RequestNumber, dynamicParameters: _startPlanParams.DynamicParameters);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception encountered.");
            }
            return _instanceId.ToString();
        }
        [HttpPost]
        public async Task CancelPlan(string planUniqueName, long planInstanceId)
        {
            _logger.LogInformation($"Arguments:({nameof(planUniqueName)}:{planUniqueName},{nameof(planInstanceId)}:{planInstanceId}).");

            try
            {
                await _svc.CancelPlanAsync(planUniqueName, planInstanceId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception encountered.");
            }
        }
    }
}
