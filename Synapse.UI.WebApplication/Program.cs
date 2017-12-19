using System.IO;
using Microsoft.AspNetCore.Hosting;
using NLog.Web;
using System;

namespace Synapse.UI.WebApplication
{
    public class Program
    {
        public static void Main(string[] args)
        {
            // NLog: setup the logger first to catch all errors
            var logger = NLogBuilder.ConfigureNLog("NLog.config").GetCurrentClassLogger();
            
            try
            {
                logger.Info("Starting web host");
                var host = new WebHostBuilder()
                .UseKestrel()
                .UseContentRoot(Directory.GetCurrentDirectory())
                //.UseIISIntegration()
                .UseNLog() // NLog: setup NLog for Dependency injection
                .UseStartup<Startup>()                
                .Build();

                host.Run();
            }
            catch (Exception e)
            {
                //NLog: catch setup errors
                logger.Error(e, "Stopped program because of exception");                
                throw;
            }
        }
    }
}
