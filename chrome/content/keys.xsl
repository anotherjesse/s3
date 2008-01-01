<?xml version="1.0" encoding="UTF-8"?>
<!--
     Copyright Jesse Andrews, 2005-2007
     http://overstimulate.com
     
     This file may be used under the terms of of the
     GNU General Public License Version 2 or later (the "GPL"),
     http://www.gnu.org/licenses/gpl.html
     
     Software distributed under the License is distributed on an "AS IS" basis,
     WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
     for the specific language governing rights and limitations under the
     License.
-->

<xsl:stylesheet version="1.0"
  xmlns:S3="http://s3.amazonaws.com/doc/2006-03-01/"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
	<table cellspacing="0">
		<thead>
			<tr>
			  <th align="left">Key</th>
			  <th align="left">Last Modified</th>
			  <th align="left">Size</th>
			  <th align="left" class="delete_button">Action</th>
			</tr>
		</thead>
		<tbody>
			<xsl:for-each select="S3:ListBucketResult/S3:CommonPrefixes">
				<tr class="s3dir">
					<td><a><xsl:attribute name="href">/<xsl:value-of select="S3:Prefix"/></xsl:attribute><xsl:value-of select="S3:Prefix"/></a></td>
				</tr>
			</xsl:for-each>
			<xsl:for-each select="S3:ListBucketResult/S3:Contents">
				<tr><xsl:if test="position() mod 2 != 1">
				    <xsl:attribute  name="class">dark_row</xsl:attribute>
				  </xsl:if>
				
				  <td><a><xsl:attribute name="href">/<xsl:value-of select="S3:Key"/></xsl:attribute><xsl:value-of select="S3:Key"/></a></td>
				  <td><xsl:value-of select="S3:LastModified"/></td>
				  <td><xsl:value-of select="S3:Size"/></td>
				  <td class="delete_button"><a href="#">
					<xsl:attribute name="key"><xsl:value-of select="S3:Key"/></xsl:attribute>
					<xsl:attribute name="onclick"><![CDATA[ if (confirm('Are you sure you want to delete ' + this.getAttribute('key') + '?')) { fm.delete( this ); } return false; ]]></xsl:attribute>[delete]</a></td>
				</tr>
			</xsl:for-each>
		</tbody>
	</table>
</xsl:template>

</xsl:stylesheet>

