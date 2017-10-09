using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Serialization;
using Microsoft.AspNetCore.Http;
using NLog.Extensions.Logging;
using NLog.Web;
using AutoMapper;
using Synapse.Core;
using Synapse.Server.UI.ViewModels;
using Synapse.Server.UI.Helpers;

//using Microsoft.CodeAnalysis;  // workaround for razor page can't see referenced libraries
//using Microsoft.AspNetCore.Mvc.Razor;  // workaround for razor page can't see referenced libraries

namespace SynapseUI
{
    public class Startup
    {
        public Startup(IHostingEnvironment env)
        {
            env.ConfigureNLog("nlog.config");

            var builder = new ConfigurationBuilder()
                .SetBasePath(env.ContentRootPath)
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true)
                .AddEnvironmentVariables();

            if (env.IsDevelopment())
            {
                // This will push telemetry data through Application Insights pipeline faster, allowing you to view results immediately.
                builder.AddApplicationInsightsSettings(developerMode: true);
            }
            Configuration = builder.Build();
        }

        public IConfigurationRoot Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            // Add framework services.
            services.AddApplicationInsightsTelemetry(Configuration);

            // Maintain property names during serialization. See:
            // https://github.com/aspnet/Announcements/issues/194
            services
                .AddMvc()
                .AddJsonOptions(options => options.SerializerSettings.ContractResolver = new DefaultContractResolver());
            
            services.AddSingleton<IConfiguration>(Configuration);
            //call this in case you need aspnet-user-authtype/aspnet-user-identity
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            // Add Kendo UI services to the services container
            services.AddKendo();

            //services.AddAutoMapper();
            // from https://dotnetthoughts.net/using-automapper-in-aspnet-core-project/
            var config = new AutoMapper.MapperConfiguration(cfg =>
            {
                cfg.CreateMap<Plan, PlanStatusVM>()
                    .ForMember(dest => dest.Status, m => m.MapFrom(src => src.Result.Status))
                    .ForMember(dest => dest.StatusText, m => m.MapFrom(src => src.Result.Status))
                    .ForMember(dest => dest.Actions, m => m.MapFrom(src => src.Actions));
                cfg.CreateMap<ActionItem, PlanStatusVM>()
                    .ForMember(dest => dest.Status, m => m.MapFrom(src => src.Result.Status))
                    .ForMember(dest => dest.StatusText, m => m.MapFrom(src => src.Result.Status))
                    .ForMember(dest => dest.Actions, m => m.MapFrom(src => src.Actions))
                    .ForMember(dest => dest.ActionGroup, m => m.MapFrom(src => src.ActionGroup));
            });
            var mapper = config.CreateMapper();
            services.AddSingleton<IMapper>(mapper);

            // workaround for razor page can't see referenced libraries
            // once we get the synapse dlls from nuget, shd try to remove this block and see if it works
            // https://stackoverflow.com/questions/37289436/razor-page-cant-see-referenced-class-library-at-run-time-in-asp-net-core-rc2
            //var myAssemblies = AppDomain.CurrentDomain.GetAssemblies().Where(x => !x.IsDynamic).Select(x => MetadataReference.CreateFromFile(x.Location)).ToList();
            //services.Configure((RazorViewEngineOptions options) =>
            //{
            //    var previous = options.CompilationCallback;
            //    options.CompilationCallback = (context) =>
            //    {
            //        previous?.Invoke(context);

            //        context.Compilation = context.Compilation.AddReferences(myAssemblies);
            //    };
            //});
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env, ILoggerFactory loggerFactory)
        {
            //-loggerFactory.AddConsole(Configuration.GetSection("Logging"));
            //-loggerFactory.AddDebug();
            // add NLog to asp.net core
            loggerFactory.AddNLog();
            env.ConfigureNLog("nlog.config");
            app.AddNLogWeb();

            //app.UseApplicationInsightsRequestTelemetry();



            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseBrowserLink();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
            }

            //app.UseApplicationInsightsExceptionTelemetry();
            //app.UseStatusCodePagesWithReExecute("/Home/Error", "?statusCode={0}");
            app.UseStatusCodePagesWithReExecute("/Home/Error/{0}");

            app.UseStaticFiles();

            app.UseMvc(routes =>
            {
                routes.MapRoute(
                    name: "default",
                    template: "{controller=Home}/{action=Index}/{id?}");
            });

            // Configure Kendo UI
            app.UseKendo(env);
        }
    }
}
