using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Synapse.UI.Modules.PlanExecution.ViewModels;
using Synapse.UI.Modules.PlanExecution.Helpers;
using Synapse.Core;
using Synapse.Core.Utilities;
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
        JsonSerializerSettings _defaultJsonSerializerSettings = new JsonSerializerSettings();

        public PlanExecution(IConfiguration configuration, ILogger<PlanExecution> logger, IMapper mapper)
        {
            _configuration = configuration;
            _logger = logger;
            _mapper = mapper;
            _apiBaseUrl = _configuration["SynapseControllerAPIURL"];
            _svc = new Synapse.Services.ControllerServiceHttpApiClient( _apiBaseUrl );
        }

        public IActionResult Index()
        {
            _logger.LogInformation( "index" );
            return View();
            //return Unauthorized(); // return BadRequest(); // used to test error handling by UseStatusCodePagesWithReExecute()
        }
        [HttpGet]
        public async Task<ActionResult> GetPlanList([DataSourceRequest] DataSourceRequest request, string filterString, bool isRegexFilter)
        {
            _logger.LogInformation( $"Arguments:({nameof( filterString )}:{filterString},{nameof( isRegexFilter )}:{isRegexFilter})." );

            List<string> planList = null;
            try
            {
                planList = await _svc.GetPlanListAsync( filterString, isRegexFilter );
                if( planList.Count == 0 )
                {
                    _logger.LogInformation( "No plans found." );
                }
            }
            catch( Exception ex )
            {
                ModelState.AddModelError( string.Empty, ex.Message );
                _logger.LogError( ex, "Exception encountered." );
            }
            //if( planList == null )
            if( ModelState.IsValid )
                return Json( planList, _defaultJsonSerializerSettings );
            else
                return Json( new List<string>().ToDataSourceResult( request, ModelState ) );
            
            //return Json( planList.ToDataSourceResult(request, ModelState), _defaultJsonSerializerSettings );
        }
        [HttpPost]
        public async Task<ActionResult> GetPlanHistoryList([DataSourceRequest] DataSourceRequest request, string planUniqueName, int showNRecs)
        {
            _logger.LogInformation( $"Arguments:({nameof( planUniqueName )}:{planUniqueName},{nameof( showNRecs )}:{showNRecs}),{nameof( request )}:{request.ToString()}." );

            List<long> planInstanceIdList = null;
            List<PlanHistoryVM> planHistoryList = null;
            try
            {
                planInstanceIdList = await _svc.GetPlanInstanceIdListAsync( planUniqueName );
                if( planInstanceIdList.Count == 0 )
                {
                    _logger.LogInformation( $"No plan history found for {planUniqueName}." );
                }
                // to add: limit no of records returned
                if( showNRecs != 0 ) planInstanceIdList = planInstanceIdList.OrderByDescending( i => i ).Take( showNRecs ).ToList();


                List<Task<Plan>> _tasks = new List<Task<Plan>>();
                foreach( long _planInstanceId in planInstanceIdList )
                {
                    _tasks.Add( _svc.GetPlanStatusAsync( planUniqueName, _planInstanceId ) );
                }
                Plan[] _planStatusList = await Task.WhenAll( _tasks );
                planHistoryList = _planStatusList.Select( x => new PlanHistoryVM() { PlanInstanceId = x.InstanceId.ToString(), RequestNumber = x.StartInfo.RequestNumber, RequestUser = x.StartInfo.RequestUser, Status = x.Result.Status, LastModified = x.LastModified } ).OrderByDescending( x => x.PlanInstanceId ).ToList();
            }
            catch( Exception ex )
            {
                ModelState.AddModelError( string.Empty, ex.Message );
                _logger.LogError( ex, "Exception encountered." );
            }
            if( planHistoryList == null )
                planHistoryList = new List<PlanHistoryVM>();
            
            return Json( planHistoryList.ToDataSourceResult( request, ModelState ), _defaultJsonSerializerSettings );
        }
        [HttpGet]
        public async Task<ActionResult> GetDynamicParameters([DataSourceRequest] DataSourceRequest request, string planUniqueName)
        {
            _logger.LogInformation( $"Arguments:({nameof( planUniqueName )}:{planUniqueName},{nameof( request )}:{request.ToString()})." );

            List<DynamicParameterVM> parms = null;
            Plan plan = null;
            try
            {
                plan = await _svc.GetPlanAsync( planUniqueName );
                parms = new List<DynamicParameterVM>();
                BuildDynamicParametersRecursive( plan.Actions, ref parms );
            }
            catch( Exception ex )
            {
                ModelState.AddModelError( string.Empty, ex.Message );
                _logger.LogError( ex, "Exception encountered." );
            }
            if( parms == null )
            {
                parms = new List<DynamicParameterVM>();
            }

            return Json( await parms.ToTreeDataSourceResultAsync( request, e => e.Id, e => e.ParentId, ModelState ), _defaultJsonSerializerSettings );
        }
        private static void BuildDynamicParametersRecursive(List<ActionItem> actions, ref List<DynamicParameterVM> parms)
        {
            int _id = 0;
            BuildDynamicParametersRecursive( actions, null, ref _id, ref parms );
        }
        private static void BuildDynamicParametersRecursive(List<ActionItem> actions, int? parentId, ref int id, ref List<DynamicParameterVM> parms, bool isActionGroup = false)
        {
            int subParentId = 0;
            int parmsParentId = 0;
            foreach( ActionItem ai in actions )
            {
                parms.Add( new DynamicParameterVM() { ActionName = ai.Name, Id = ++id, ParentId = parentId, IsActionGroup = isActionGroup } );
                subParentId = id;
                // config parameters
                if( ai.Handler != null && ai.Handler.HasConfig && ai.Handler.Config.HasDynamic )
                {
                    parms.Add( new DynamicParameterVM() { ActionName = "Config", Id = ++id, ParentId = subParentId } );
                    parmsParentId = id;
                    foreach( DynamicValue dv in ai.Handler.Config.Dynamic )
                    {
                        DynamicParameterVM parmToAdd = new DynamicParameterVM() { ActionName = "", Id = ++id, ParentId = parmsParentId, Source = dv.Source, Options = dv.Options, RestrictToOptions = dv.RestrictToOptions, DataType = dv.DataType.ToString(), Validation = dv.Validation };
                        // show unique parameter within the same action
                        // if parameter name exists across actions, only 1 is editable
                        if( !parms.Contains( parmToAdd ) )
                        {
                            if( !parms.Exists( x => x.Source == parmToAdd.Source ) )
                                parmToAdd.Editable = true;
                            parms.Add( parmToAdd );
                        }
                    }
                }
                // action parameters
                if( ai.HasParameters && ai.Parameters.HasDynamic )
                {
                    parms.Add( new DynamicParameterVM() { ActionName = "Parameters", Id = ++id, ParentId = subParentId } );
                    parmsParentId = id;
                    foreach( DynamicValue dv in ai.Parameters.Dynamic )
                    {
                        DynamicParameterVM parmToAdd = new DynamicParameterVM() { ActionName = "", Id = ++id, ParentId = parmsParentId, Source = dv.Source, Options = dv.Options, RestrictToOptions = dv.RestrictToOptions, DataType = dv.DataType.ToString(), Validation = dv.Validation };
                        if( !parms.Contains( parmToAdd ) )
                        {
                            if( !parms.Exists( x => x.Source == parmToAdd.Source ) )
                                parmToAdd.Editable = true;
                            parms.Add( parmToAdd );
                        }
                    }
                }
                //if( _ai.HasActionGroup ) BuildDynamicParametersRecursive( _ai.ActionGroup, subParentId, ref id, ref parms );
                if( ai.HasActionGroup ) BuildDynamicParametersRecursive( new List<ActionItem> { ai.ActionGroup }, subParentId, ref id, ref parms, true );
                if( ai.HasActions ) BuildDynamicParametersRecursive( ai.Actions, subParentId, ref id, ref parms );

            }
        }
        //private static void BuildDynamicParametersRecursive(ActionItem actionGroup, int? parentId, ref int id, ref List<DynamicParameterVM> parms)
        //{
        //    int subParentId = 0;
        //    int parmsParentId = 0;
        //    parms.Add( new DynamicParameterVM() { ActionName = actionGroup.Name, IsActionGroup = true, Id = ++id, ParentId = parentId } );
        //    subParentId = id;
        //    // config parameters
        //    if( actionGroup.Handler != null && actionGroup.Handler.HasConfig && actionGroup.Handler.Config.HasDynamic )
        //    {
        //        parms.Add( new DynamicParameterVM() { ActionName = "Config", Id = ++id, ParentId = subParentId } );
        //        parmsParentId = id;
        //        foreach( DynamicValue dv in actionGroup.Handler.Config.Dynamic )
        //        {
        //            DynamicParameterVM parmToAdd = new DynamicParameterVM() { ActionName = "", Id = ++id, ParentId = parmsParentId, Source = dv.Source, Options = dv.Options, RestrictToOptions = dv.RestrictToOptions, DataType = dv.DataType, Validation = dv.Validation };
        //            if( !parms.Contains( parmToAdd ) )
        //                parms.Add( parmToAdd );
        //        }
        //    }
        //    // action parameters
        //    if( actionGroup.HasParameters && actionGroup.Parameters.HasDynamic )
        //    {
        //        parms.Add( new DynamicParameterVM() { ActionName = "Parameters", Id = ++id, ParentId = subParentId } );
        //        parmsParentId = id;
        //        foreach( DynamicValue dv in actionGroup.Parameters.Dynamic )
        //        {
        //            DynamicParameterVM parmToAdd = new DynamicParameterVM() { ActionName = "", Id = ++id, ParentId = parmsParentId, Source = dv.Source, Options = dv.Options, RestrictToOptions = dv.RestrictToOptions, DataType = dv.DataType, Validation = dv.Validation };
        //            if( !parms.Contains( parmToAdd ) )
        //                parms.Add( parmToAdd );
        //        }
        //    }
        //    if( actionGroup.HasActions ) BuildDynamicParametersRecursive( actionGroup.Actions, subParentId, ref id, ref parms );

        //}
        [HttpGet]
        public async Task<ActionResult> GetPlanStatus(string planUniqueName, long planInstanceId)
        {
            _logger.LogInformation( $"Argumnets:({nameof( planUniqueName )}:{planUniqueName},{nameof( planInstanceId )}:{planInstanceId})." );
            string error = null;

            Plan plan = null;
            try
            {
                plan = await _svc.GetPlanStatusAsync( planUniqueName, planInstanceId );
            }
            catch( Exception ex )
            {
                error = ex.Message;
                _logger.LogError( ex, "Exception encountered." );
            }
            //if (_plan == null) _plan = new Plan();
            if( plan == null )
                return Json( new EmptyResult() );
            else
            {
                JsonSerializerSettings _serializerSettings = new JsonSerializerSettings();
                _serializerSettings.Converters.Add( new StringEnumConverter() );
                _serializerSettings.Converters.Add( new LongStringConverter() );  // used to convert instanceID to string so they can be read in full by javascript
                return Json( plan, _serializerSettings );
            }

        }
        [HttpGet]
        public async Task<ActionResult> GetPlanForDiagram(string planUniqueName)
        {
            _logger.LogInformation( $"Arguments:({nameof( planUniqueName )}:{planUniqueName})." );

            Plan plan = null;
            PlanStatusVM status = null;
            try
            {
                plan = await _svc.GetPlanAsync( planUniqueName );
                status = _mapper.Map<Plan, PlanStatusVM>( plan );

                List<PlanStatusVM> actions = null;
                actions = MoveActionGroupToActionsRecursive( status.Actions );
                status.Actions = actions;
            }
            catch( Exception ex )
            {
                _logger.LogError( ex, "Exception encountered." );
            }
            if( status == null ) //_plan = new Plan();
                return new EmptyResult();
            else
                return Json( status, _defaultJsonSerializerSettings );
        }
        [HttpGet]
        public async Task<ActionResult> GetResultPlanForDiagram(string planUniqueName, long planInstanceId)
        {
            _logger.LogInformation( $"Arguments:({nameof( planUniqueName )}:{planUniqueName},{nameof( planInstanceId )}:{planInstanceId})." );

            Plan plan = null;
            PlanStatusVM status = null;
            try
            {
                plan = await _svc.GetPlanStatusAsync( planUniqueName, planInstanceId );
                status = _mapper.Map<Plan, PlanStatusVM>( plan );

                List<PlanStatusVM> actions = null;
                actions = MoveActionGroupToActionsRecursive( status.Actions );
                status.Actions = actions;
            }
            catch( Exception ex )
            {
                _logger.LogError( ex, "Exception encountered." );
            }
            if( status == null ) //_plan = new Plan();
                return new EmptyResult();
            else
                return Json( status, _defaultJsonSerializerSettings );
        }
        public List<PlanStatusVM> MoveActionGroupToActionsRecursive(List<PlanStatusVM> actions)
        {
            foreach( PlanStatusVM item in actions )
            {
                if( item.ActionGroup != null )
                {
                    if( item.Actions != null ) item.Actions.Insert( 0, item.ActionGroup );
                    else (item.Actions ) = new List<PlanStatusVM> { item.ActionGroup };
                    item.Actions[0].IsActionGroup = true;
                    item.ActionGroup = null;
                }
                if( item.Actions != null && item.Actions.Count > 0 )
                {
                    item.Actions = MoveActionGroupToActionsRecursive( item.Actions );
                }
            }
            return actions;
        }
        [HttpPost]
        public async Task<ActionResult> StartPlan([FromBody] Newtonsoft.Json.Linq.JObject requestLoad)
        {
            _logger.LogInformation( $"Arguments:({nameof( requestLoad )}:{requestLoad.ToString()})." );
            
            StartPlanParmsVM startPlanParms = JsonConvert.DeserializeObject<StartPlanParmsVM>( Convert.ToString( requestLoad ) );
            bool ok = false;
            string remoteServiceErrorMessage = string.Empty;
            ResponseVM r = null;

            long instanceId = 0;
            try
            {
                // validate parameters first
                Plan plan = await _svc.GetPlanAsync( startPlanParms.PlanUniqueName );
                List<DynamicValue> dynamicValues = plan.GetDynamicValues( true );

                foreach( KeyValuePair<string, string> parm in startPlanParms.DynamicParameters )
                {
                    if( !string.IsNullOrWhiteSpace( parm.Value ) )
                    {
                        DynamicValue dv = dynamicValues.Find( x => x.Source == parm.Key );
                        if( dv != null )
                        {
                            if( !dv.Validate( parm.Value, out string error ) )
                            {
                                ModelState.AddModelError( parm.Key, error );
                                //throw new ArgumentException( error );
                                //_logger.LogError()
                            }
                        }
                    }
                }
                if( ModelState.IsValid )
                {
                    instanceId = await _svc.StartPlanAsync( planName: startPlanParms.PlanUniqueName, requestNumber: startPlanParms.RequestNumber, dynamicParameters: startPlanParms.DynamicParameters );
                    ok = true;
                }

            }
            catch( Exception ex )
            {
                remoteServiceErrorMessage = ex.Message;
                _logger.LogError( ex, "Exception encountered." );
            }
            if( ok )
            {
                r = new ResponseVM
                {
                    Status = Constants.SUCCESS,
                    Data = instanceId.ToString(),
                };
            }
            else if( ! ModelState.IsValid )
            {
                // https://gist.github.com/jpoehls/2230255
                // https://www.telerik.com/forums/how-to-show-server-validation-message-like-local-validation
                r = new ResponseVM
                {
                    Status = Constants.ERROR,
                    ValidationErrors = ModelState       
                                            .Where( x => x.Value.Errors.Count > 0 )
                                            .ToDictionary(
                                                kvp => kvp.Key,
                                                kvp => kvp.Value.Errors.Select( e => e.ErrorMessage ).ToArray()
                                            )
                };
            }
            else
            {
                r = new ResponseVM
                {
                    Status = Constants.ERROR,
                    Message = remoteServiceErrorMessage
                };
            }
            return Json( r, _defaultJsonSerializerSettings ); // instanceId.ToString();
        }
        [HttpPost]
        public async Task CancelPlan(string planUniqueName, long planInstanceId)
        {
            _logger.LogInformation( $"Arguments:({nameof( planUniqueName )}:{planUniqueName},{nameof( planInstanceId )}:{planInstanceId})." );

            try
            {
                await _svc.CancelPlanAsync( planUniqueName, planInstanceId );
            }
            catch( Exception ex )
            {
                _logger.LogError( ex, "Exception encountered." );
            }
        }
        public async Task<bool> IsConnected()
        {
            bool isConnected = false;
            try
            {
                await _svc.HelloAsync();
                isConnected = true;
            }
            catch (Exception ex)
            {
                _logger.LogError( ex, "Not able to connect to remote service" );
            }
            return isConnected;
        }
    }
}
